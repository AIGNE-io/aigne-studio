import { copyFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';

import { NotFoundError } from '@api/libs/error';
import logger from '@api/libs/logger';
import { resourceManager } from '@api/libs/resource';
import middlewares from '@blocklet/sdk/lib/middlewares';
import express, { Router } from 'express';
import { pathExists, readFile } from 'fs-extra';
import Joi from 'joi';
import { Op } from 'sequelize';
import { joinURL } from 'ufo';
import { parse } from 'yaml';

import ensureKnowledgeDirExists, { getProcessedFileDir, getSourceFileDir } from '../../libs/ensure-dir';
import { Config } from '../../libs/env';
import { userAuth } from '../../libs/security';
import Knowledge from '../../store/models/dataset/dataset';
import KnowledgeDocument from '../../store/models/dataset/document';
import EmbeddingHistories from '../../store/models/dataset/embedding-history';
import HybridRetriever from './retriever';
import { queue } from './util/queue';
import { updateHistoriesAndStore } from './util/vector-store';

const { initLocalStorageServer } = require('@blocklet/uploader-server');

const router = Router();

export interface CreateDiscussionItem {
  name: string;
  data: {
    id: string;
    title: string;
    type?: 'discussion' | 'blog' | 'doc';
    from: 'discussion' | 'board' | 'discussionType';
    boardId?: string;
  };
}

const getDocumentsSchema = Joi.object<{ page: number; size: number }>({
  page: Joi.number().integer().min(1).default(1),
  size: Joi.number().integer().min(1).max(100).default(20),
});

const documentIdSchema = Joi.object<{ knowledgeId: string; documentId: string }>({
  knowledgeId: Joi.string().required(),
  documentId: Joi.string().required(),
});

export type CreateDiscussionItemInput = CreateDiscussionItem | CreateDiscussionItem[];

const messages = {
  'any.required': 'input parameter {{#label}} is required.',
};

const searchQuerySchema = Joi.object<{ blockletDid?: string; message?: string; n: number }>({
  blockletDid: Joi.string().empty(['', null]),
  message: Joi.string().empty(['', null]),
  n: Joi.number().empty(['', null]).min(1).default(4),
}).messages(messages);

async function getVectorPath(blockletDid: string | null, knowledgeId: string, knowledge: any) {
  let resourceToCheck = null;

  if (blockletDid) {
    resourceToCheck = { blockletDid, knowledgeId };
  } else if (knowledge?.resourceBlockletDid && knowledge?.knowledgeId) {
    resourceToCheck = {
      blockletDid: knowledge.resourceBlockletDid,
      knowledgeId: knowledge.knowledgeId,
    };
  }

  if (resourceToCheck) {
    const resource = await resourceManager.getKnowledge(resourceToCheck);

    if (!resource) {
      throw new NotFoundError('No such knowledge resource');
    }

    return (await pathExists(join(resource.vectorsPath, 'faiss.index')))
      ? resource.vectorsPath
      : join(resource.vectorsPath, resourceToCheck.knowledgeId);
  }

  return knowledgeId;
}

router.get('/:knowledgeId/search', async (req, res) => {
  const { knowledgeId } = req.params;
  const input = await searchQuerySchema.validateAsync(req.query, { stripUnknown: true });
  const knowledge = await Knowledge.findOne({ where: { id: knowledgeId } });
  const vectorPathOrKnowledgeId = await getVectorPath(input.blockletDid!, knowledgeId, knowledge);

  const retriever = new HybridRetriever(vectorPathOrKnowledgeId, input.n!);
  const result = await retriever.search(input.message || ' ');

  const docs = await Promise.all(
    result.map(async (i) => {
      if (i.metadata?.metadata?.documentId) {
        const doc = await KnowledgeDocument.findOne({ where: { id: i.metadata?.metadata?.documentId } });

        return {
          content: i.pageContent,
          metadata: {
            document: doc?.dataValues,
            metadata: { ...(i.metadata?.metadata || {}), relevanceScore: i.metadata?.relevanceScore || 0 },
          },
        };
      }

      return {
        content: i.pageContent,
        metadata: {
          document: null,
          metadata: { ...(i.metadata?.metadata || {}), relevanceScore: i.metadata?.relevanceScore || 0 },
        },
      };
    })
  );

  res.json({ docs });
});

router.get('/:knowledgeId/documents', middlewares.session(), userAuth(), async (req, res) => {
  const { did, isAdmin } = req.user!;
  const { knowledgeId } = req.params;
  const user = isAdmin ? {} : { [Op.or]: [{ createdBy: did }, { updatedBy: did }] };
  if (!knowledgeId) throw new Error('Missing required params `knowledgeId`');

  const { page, size } = await getDocumentsSchema.validateAsync(req.query, { stripUnknown: true });

  const knowledge = await Knowledge.findOne({ where: { id: knowledgeId } });

  if (knowledge?.resourceBlockletDid && knowledge?.knowledgeId) {
    const resource = await resourceManager.getKnowledge({
      blockletDid: knowledge.resourceBlockletDid,
      knowledgeId: knowledge.knowledgeId,
    });

    const docs = [...(resource?.documents || [])].splice(page - 1, size);
    res.json({ items: docs, total: resource?.documents.length, page });
    return;
  }

  const params = { knowledgeId, ...user };
  const [items, total] = await Promise.all([
    KnowledgeDocument.findAll({
      order: [['createdAt', 'DESC']],
      where: params,
      offset: (page - 1) * size,
      limit: size,
    }),
    KnowledgeDocument.count({ where: params }),
  ]);

  res.json({ items, total, page });
});

router.delete('/:knowledgeId/documents/:documentId', middlewares.session(), userAuth(), async (req, res) => {
  const { knowledgeId, documentId } = await documentIdSchema.validateAsync(req.params, { stripUnknown: true });

  const document = await KnowledgeDocument.findOne({ where: { id: documentId, knowledgeId } });

  await updateHistoriesAndStore(knowledgeId, documentId);

  if (document && document.filename) {
    await Promise.all([rm(joinURL(getProcessedFileDir(knowledgeId), `${document.id}.yml`))]).catch(logger.error);
  }

  await Promise.all([
    KnowledgeDocument.destroy({ where: { id: documentId, knowledgeId } }),
    EmbeddingHistories.destroy({ where: { documentId, knowledgeId } }),
  ]);

  res.json(document);
});

const fileSchema = Joi.object<{
  filename: string;
  name: string;
  size: number;
}>({
  filename: Joi.string().required(),
  name: Joi.string().allow('').default(''),
  size: Joi.number().required(),
});

router.post('/:knowledgeId/documents/file', middlewares.session(), userAuth(), async (req, res) => {
  const { did } = req.user!;
  const { knowledgeId } = req.params;
  if (!knowledgeId) throw new Error('Missing required params `knowledgeId`');

  const { name, filename, size } = await fileSchema.validateAsync(req.body, { stripUnknown: true });
  const newFilePath = joinURL(getSourceFileDir(knowledgeId), filename);

  if (!(await pathExists(newFilePath))) throw new NotFoundError(`file ${newFilePath} not found`);

  const document = await KnowledgeDocument.create({
    type: 'file',
    name,
    knowledgeId,
    createdBy: did,
    updatedBy: did,
    embeddingStatus: 'idle',
    filename,
    size,
    data: { type: 'file' },
  });

  queue.checkAndPush({ type: 'document', knowledgeId, documentId: document.id });

  res.json(document);
});

const customDocumentSchema = Joi.object<{ title: string; content: string }>({
  title: Joi.string().required(),
  content: Joi.string().required(),
});

router.post('/:knowledgeId/documents/custom', middlewares.session(), userAuth(), async (req, res) => {
  const { did } = req.user!;
  const { knowledgeId } = req.params;
  if (!knowledgeId) throw new Error('Missing required params `knowledgeId`');

  const { title, content } = await customDocumentSchema.validateAsync(req.body, { stripUnknown: true });

  const document = await KnowledgeDocument.create({
    type: 'text',
    name: title,
    knowledgeId,
    createdBy: did,
    updatedBy: did,
    embeddingStatus: 'idle',
    filename: '',
    size: 0,
    data: { type: 'text' },
  });

  const originalFileName = `${document.id}.txt`;
  const originalFilePath = joinURL(getSourceFileDir(knowledgeId), originalFileName);
  await writeFile(originalFilePath, content);
  await document.update({ filename: originalFileName });

  queue.checkAndPush({ type: 'document', knowledgeId, documentId: document.id });

  res.json(document);
});

router.put('/:knowledgeId/documents/custom/:documentId', middlewares.session(), userAuth(), async (req, res) => {
  const { knowledgeId, documentId } = await documentIdSchema.validateAsync(req.params, { stripUnknown: true });
  const { title, content } = await customDocumentSchema.validateAsync(req.body, { stripUnknown: true });

  await Promise.all([
    KnowledgeDocument.update({ name: title, content }, { where: { id: documentId, knowledgeId } }),
    EmbeddingHistories.destroy({ where: { documentId, knowledgeId } }),
    updateHistoriesAndStore(knowledgeId, documentId),
  ]);

  const originalFileName = `${documentId}.txt`;
  const originalFilePath = joinURL(getSourceFileDir(knowledgeId), originalFileName);
  await writeFile(originalFilePath, content);

  queue.checkAndPush({ type: 'document', knowledgeId, documentId });

  res.json({ title, content });
});

const createItemsSchema = Joi.object<{ name: string; data: CreateDiscussionItem['data'] }>({
  name: Joi.string().empty(['', null]),
  data: Joi.object({
    from: Joi.string().valid('discussion', 'board', 'discussionType').required(),
    type: Joi.string().valid('discussion', 'blog', 'doc').optional(),
    title: Joi.string().allow('', null).required(),
    id: Joi.string().required(),
    boardId: Joi.string().allow('', null).default(''),
  }).required(),
});

const createItemInputSchema = Joi.alternatives<CreateDiscussionItemInput>().try(
  Joi.array().items(createItemsSchema),
  createItemsSchema
);

router.post('/:knowledgeId/documents/discussion', middlewares.session(), async (req, res) => {
  const { did } = req.user!;
  const { knowledgeId } = req.params;
  if (!knowledgeId) throw new Error('Missing required params `knowledgeId`');

  const input = await createItemInputSchema.validateAsync(req.body, { stripUnknown: true });

  const arr = Array.isArray(input) ? input : [input];

  const createOrUpdate = async (name: string, data: CreateDiscussionItem['data']) => {
    const found = await KnowledgeDocument.findOne({
      where: { knowledgeId, 'data.id': data.id, 'data.from': data.from },
    });

    if (found) {
      return found.update(
        { name, updatedBy: did },
        { where: { knowledgeId, 'data.id': data.id, 'data.from': data.from } }
      );
    }

    return KnowledgeDocument.create({
      name,
      type: 'discussKit',
      data: { type: 'discussKit', data },
      knowledgeId,
      createdBy: did,
      updatedBy: did,
      embeddingStatus: 'idle',
    });
  };

  const docs = await Promise.all(
    arr.map(async (item) => {
      const document = await createOrUpdate(item.name, item.data);
      queue.checkAndPush({ type: 'document', knowledgeId, documentId: document.id });
      return document;
    })
  );

  return res.json(Array.isArray(input) ? docs : docs[0]);
});

const crawlSchema = Joi.object<{ provider: 'jina' | 'firecrawl'; url: string }>({
  provider: Joi.string().valid('jina', 'firecrawl').required(),
  url: Joi.string().required(),
});

router.post('/:knowledgeId/documents/url', middlewares.session(), userAuth(), async (req, res) => {
  const { did } = req.user!;
  const { knowledgeId } = req.params;
  if (!knowledgeId) throw new Error('Missing required params `knowledgeId`');

  const { provider, url } = await crawlSchema.validateAsync(req.body, { stripUnknown: true });

  const document = await KnowledgeDocument.create({
    type: 'url',
    name: url,
    knowledgeId,
    createdBy: did,
    updatedBy: did,
    embeddingStatus: 'idle',
    size: 0,
    data: { type: 'url', provider, url },
  });

  queue.checkAndPush({ type: 'document', knowledgeId, documentId: document.id });

  res.json(document);
});

router.get('/:knowledgeId/documents/:documentId', middlewares.session(), userAuth(), async (req, res) => {
  const { did, isAdmin } = req.user!;
  const user = isAdmin ? {} : { [Op.or]: [{ createdBy: did }, { updatedBy: did }] };

  const { knowledgeId, documentId } = await documentIdSchema.validateAsync(req.params, { stripUnknown: true });

  const [dataset, document] = await Promise.all([
    Knowledge.findOne({ where: { id: knowledgeId, ...user } }),
    KnowledgeDocument.findOne({ where: { knowledgeId, id: documentId } }),
  ]);

  if (document && document.type === 'text') {
    const processedFilePath = join(getProcessedFileDir(knowledgeId), `${documentId}.yml`);
    let content = '';
    if (await pathExists(processedFilePath)) {
      try {
        content = parse(await readFile(processedFilePath, 'utf-8')).content;
      } catch (error) {
        logger.error(error);
      }
    }
    document.dataValues.content = content;
  }

  res.json({ dataset, document });
});

router.get('/:knowledgeId/documents/:documentId/content', middlewares.session(), userAuth(), async (req, res) => {
  const { knowledgeId, documentId } = await documentIdSchema.validateAsync(req.params, { stripUnknown: true });

  const document = await KnowledgeDocument.findOne({ where: { knowledgeId, id: documentId } });
  if (!document?.filename) {
    return res.json({ filename: '' });
  }

  const filePath = joinURL(getSourceFileDir(knowledgeId), document.filename);
  if (!(await pathExists(filePath))) throw new NotFoundError(`file ${filePath} not found`);

  return res.json({ filename: document.filename });
});

router.post('/:knowledgeId/documents/:documentId/embedding', middlewares.session(), userAuth(), async (req, res) => {
  const { knowledgeId, documentId } = await documentIdSchema.validateAsync(req.params, { stripUnknown: true });

  const document = await KnowledgeDocument.findOne({ where: { id: documentId } });

  if (document) queue.checkAndPush({ type: 'document', knowledgeId, documentId: document.id, update: true });

  res.json(document);
});

const localStorageServer = initLocalStorageServer({
  path: Config.uploadDir,
  express,
  onUploadFinish: async (req: any, _res: any, uploadMetadata: any) => {
    const { knowledgeId } = req.query;
    const { hashFileName, absolutePath } = uploadMetadata.runtime;
    const newFilePath = joinURL(getSourceFileDir(knowledgeId), hashFileName);

    await ensureKnowledgeDirExists(knowledgeId);
    await copyFile(absolutePath, newFilePath);

    // 延迟文件移动操作
    setTimeout(async () => {
      await rm(absolutePath, { recursive: true, force: true });
    }, 3000);

    return { ...uploadMetadata, newFilePath };
  },
});
router.use('/upload-document', middlewares.session(), localStorageServer.handle);

export default router;
