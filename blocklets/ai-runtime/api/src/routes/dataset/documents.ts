import { copyFile, rm } from 'fs/promises';
import { join } from 'path';

import { resourceManager } from '@api/libs/resource';
import user from '@blocklet/sdk/lib/middlewares/user';
import { initLocalStorageServer } from '@blocklet/uploader/lib/middlewares';
import express, { Router } from 'express';
import Joi from 'joi';
import { sortBy } from 'lodash';
import { Op, Sequelize } from 'sequelize';
import { joinURL } from 'ufo';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import ensureKnowledgeDirExists, { getUploadDir } from '../../libs/ensure-dir';
import { Config } from '../../libs/env';
import logger from '../../libs/logger';
import { userAuth } from '../../libs/security';
import DatasetContent from '../../store/models/dataset/content';
import Dataset from '../../store/models/dataset/dataset';
import DatasetDocument from '../../store/models/dataset/document';
import EmbeddingHistories from '../../store/models/dataset/embedding-history';
import VectorStore from '../../store/vector-store-faiss';
import getAllContents, { getAllResourceContents, getContent } from './document-content';
import { queue } from './embeddings';
import { updateHistoriesAndStore } from './vector-store';

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

export type CreateDiscussionItemInput = CreateDiscussionItem | CreateDiscussionItem[];

const searchQuerySchema = Joi.object<{ blockletDid?: string; message?: string; searchAll?: boolean; n: number }>({
  blockletDid: Joi.string().empty(['', null]),
  message: Joi.string().empty(['', null]),
  searchAll: Joi.boolean().default(false).empty(['', null]),
  n: Joi.number().empty(['', null]).min(1).default(4),
});

type Input = { message?: string; searchAll?: boolean; n: number };

const searchResourceKnowledge = async (blockletDid: string, knowledgeId: string, input: Input) => {
  const resource = await resourceManager.getKnowledge({ blockletDid, knowledgeId });

  if (!resource) {
    return { docs: [] };
  }

  if (input.searchAll) {
    const docs = await getAllResourceContents(resource);
    return { docs };
  }

  if (!input.message) {
    throw new Error('Not found search message');
  }

  const embeddings = new AIKitEmbeddings({});
  const store = await VectorStore.load(join(resource.vectorsPath, knowledgeId), embeddings);

  if (store.getMapping() && !Object.keys(store.getMapping()).length) {
    logger.error('store get mapping is empty');
    return { docs: [] };
  }

  const docs = await store.similaritySearchWithScore(
    input.message,
    Math.min(input.n, Object.keys(store.getMapping()).length)
  );

  // 分数越低越相近
  const result = sortBy(docs, (item) => item[1]).map((x) => {
    const info = x[0] || {};
    return { content: info?.pageContent, ...(info?.metadata?.metadata || {}) };
  });

  return { docs: result };
};

router.get('/:datasetId/search', async (req, res) => {
  const { datasetId } = req.params;
  const input = await searchQuerySchema.validateAsync(req.query, { stripUnknown: true });
  logger.info('knowledge search input', input);

  if (input.blockletDid) {
    res.json(await searchResourceKnowledge(input.blockletDid, datasetId, input));
    return;
  }

  const dataset = await Dataset.findOne({ where: { id: datasetId } });
  if (!dataset) {
    logger.error(`dataset ${datasetId} not found`);
    res.json({ docs: [] });
    return;
  }

  if (input.searchAll) {
    const docs = await getAllContents(datasetId);
    res.json({ docs });
    return;
  }

  if (!input.message) {
    throw new Error('Not found search message');
  }

  const embeddings = new AIKitEmbeddings({});
  const store = await VectorStore.load(datasetId, embeddings);

  if (store.getMapping() && !Object.keys(store.getMapping()).length) {
    logger.error('store get mapping is empty');
    res.json({ docs: [] });
    return;
  }

  const docs = await store.similaritySearchWithScore(
    input.message,
    Math.min(input.n, Object.keys(store.getMapping()).length)
  );

  // 分数越低越相近
  const result = sortBy(docs, (item) => item[1]).map((x) => {
    const info = x[0] || {};
    return { content: info?.pageContent, ...(info?.metadata?.metadata || {}) };
  });

  res.json({ docs: result });
});

router.get('/:datasetId/documents', user(), userAuth(), async (req, res) => {
  const { did, isAdmin } = req.user!;
  const { datasetId } = req.params;
  const user = isAdmin ? {} : { [Op.or]: [{ createdBy: did }, { updatedBy: did }] };

  if (!datasetId) throw new Error('Missing required params `datasetId`');

  const { blockletDid, page, size } = await Joi.object<{ blockletDid?: string; page: number; size: number }>({
    blockletDid: Joi.string().empty(['', null]),
    page: Joi.number().integer().min(1).default(1),
    size: Joi.number().integer().min(1).max(100).default(20),
  }).validateAsync(req.query, { stripUnknown: true });

  if (blockletDid) {
    const knowledge = await resourceManager.getKnowledge({ blockletDid, knowledgeId: datasetId });
    const docs = [...(knowledge?.documents || [])].splice(page - 1, size);
    res.json({ items: docs, total: knowledge?.documents.length });
    return;
  }

  const [items, total] = await Promise.all([
    DatasetDocument.findAll({
      order: [['createdAt', 'DESC']],
      where: { datasetId, ...user },
      offset: (page - 1) * size,
      limit: size,
      attributes: {
        include: [
          [
            Sequelize.literal(`(
              SELECT content
              FROM DatasetContents
              WHERE DatasetContents.documentId = DatasetDocument.id
              LIMIT 1
            )`),
            'content',
          ],
        ],
      },
    }),
    DatasetDocument.count({ where: { datasetId, ...user } }),
  ]);

  res.json({ items, total });
});

router.delete('/:datasetId/documents/:documentId', user(), userAuth(), async (req, res) => {
  const { datasetId, documentId } = await Joi.object<{ datasetId: string; documentId: string }>({
    datasetId: Joi.string().required(),
    documentId: Joi.string().required(),
  }).validateAsync(req.params, { stripUnknown: true });

  if (!datasetId || !documentId) {
    throw new Error('Missing required params `datasetId` or `documentId`');
  }

  const document = DatasetDocument.findOne({ where: { id: documentId, datasetId } });

  await updateHistoriesAndStore(datasetId, documentId);

  await Promise.all([
    DatasetDocument.destroy({ where: { id: documentId, datasetId } }),
    DatasetContent.destroy({ where: { documentId } }),
    EmbeddingHistories.destroy({ where: { documentId, datasetId } }),
  ]);

  res.json(document);
});

router.put('/:datasetId/documents/:documentId/name', user(), userAuth(), async (req, res) => {
  const { did } = req.user!;
  const { datasetId, documentId } = req.params;

  const { name } = await Joi.object<{ name: string }>({ name: Joi.string().required() }).validateAsync(req.body, {
    stripUnknown: true,
  });

  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  if (!documentId) {
    throw new Error('Missing required params `datasetId`');
  }

  await DatasetDocument.update({ name, updatedBy: did }, { where: { id: documentId, datasetId } });

  const document = await DatasetDocument.findOne({ where: { id: documentId, datasetId } });
  res.json(document);
});

router.post('/:datasetId/documents/text', user(), userAuth(), async (req, res) => {
  const { did } = req.user!;
  const { datasetId } = req.params;

  const input = await Joi.object<{ name: string; content?: string }>({
    name: Joi.string().allow('').default(''),
    content: Joi.string().allow('').default(''),
  }).validateAsync(req.body, { stripUnknown: true });

  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  const { name, content } = input;
  const type = 'text';

  const document = await DatasetDocument.create({
    type,
    name,
    data: { type, content: content || '' },
    datasetId,
    createdBy: did,
    updatedBy: did,
    embeddingStatus: 'idle',
  });
  await DatasetContent.create({ documentId: document.id, content });

  queue.checkAndPush({ type: 'document', datasetId, documentId: document.id });

  res.json(document);
});

router.post('/:datasetId/documents/discussion', user(), async (req, res) => {
  const { datasetId } = req.params;

  const createItemsSchema = Joi.object({
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

  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  const input = await createItemInputSchema.validateAsync(req.body, { stripUnknown: true });
  const { did } = req.user!;

  const arr = Array.isArray(input) ? input : [input];

  const createOrUpdate = async (name: string, data: CreateDiscussionItem['data']) => {
    const found = await DatasetDocument.findOne({ where: { datasetId, 'data.id': data.id, 'data.from': data.from } });
    if (found) {
      return found.update(
        { name, updatedBy: did },
        { where: { datasetId, 'data.id': data.id, 'data.from': data.from } }
      );
    }

    return DatasetDocument.create({
      type: 'discussKit',
      data: { type: 'discussKit', data },
      name,
      datasetId,
      createdBy: did,
      updatedBy: did,
      embeddingStatus: 'idle',
    });
  };

  const docs = await Promise.all(
    arr.map(async (item) => {
      const document = await createOrUpdate(item.name, item.data);
      queue.checkAndPush({ type: 'document', datasetId, documentId: document.id });
      return document;
    })
  );

  return res.json(Array.isArray(input) ? docs : docs[0]);
});

router.put('/:datasetId/documents/:documentId/text', user(), userAuth(), async (req, res) => {
  const { did } = req.user! || {};
  const { datasetId, documentId } = await Joi.object<{
    datasetId: string;
    documentId: string;
  }>({
    datasetId: Joi.string().required(),
    documentId: Joi.string().required(),
  }).validateAsync(req.params, { stripUnknown: true });

  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  const { name, content } = await Joi.object<{ name: string; content?: string }>({
    name: Joi.string().allow('', null).optional(),
    content: Joi.string().allow('', null).optional(),
  }).validateAsync(req.body, { stripUnknown: true });

  await DatasetDocument.update({ error: null, name, updatedBy: did }, { where: { id: documentId, datasetId } });
  await DatasetContent.update({ content }, { where: { documentId } });

  const document = await DatasetDocument.findOne({ where: { id: documentId, datasetId } });

  if (document) queue.checkAndPush({ type: 'document', datasetId, documentId: document.id });

  res.json(document);
});

router.get('/:datasetId/documents/:documentId', user(), userAuth(), async (req, res) => {
  const { did, isAdmin } = req.user!;
  const user = isAdmin ? {} : { [Op.or]: [{ createdBy: did }, { updatedBy: did }] };

  const { datasetId, documentId } = await Joi.object<{ datasetId: string; documentId: string }>({
    datasetId: Joi.string().required(),
    documentId: Joi.string().required(),
  }).validateAsync(req.params);

  const [dataset, document, content] = await Promise.all([
    Dataset.findOne({ where: { id: datasetId, ...user } }),
    DatasetDocument.findOne({ where: { datasetId, id: documentId } }),
    DatasetContent.findOne({ where: { documentId }, attributes: ['content'] }),
  ]);

  if (document?.dataValues) document.dataValues.content = content?.dataValues.content;
  res.json({ dataset, document });
});

router.get('/:datasetId/documents/:documentId/content', user(), userAuth(), async (req, res) => {
  const { datasetId, documentId } = await Joi.object<{ datasetId: string; documentId: string }>({
    datasetId: Joi.string().required(),
    documentId: Joi.string().required(),
  }).validateAsync(req.params);

  const document = await DatasetDocument.findOne({ where: { datasetId, id: documentId } });
  if (!document) {
    return res.json({ content: [] });
  }

  const content = await getContent(datasetId, document);
  return res.json({ content });
});

router.post('/:datasetId/documents/:documentId/embedding', user(), userAuth(), async (req, res) => {
  const { datasetId, documentId } = await Joi.object<{ datasetId: string; documentId: string }>({
    documentId: Joi.string().required(),
    datasetId: Joi.string().required(),
  }).validateAsync(req.params, { stripUnknown: true });

  const [document] = await Promise.all([DatasetDocument.findOne({ where: { id: documentId } })]);

  if (document) queue.checkAndPush({ type: 'document', datasetId, documentId: document.id });

  res.json(document);
});

const localStorageServer = initLocalStorageServer({
  path: Config.uploadDir,
  express,
  onUploadFinish: async (req: any, _res: any, uploadMetadata: any) => {
    const { documentId, datasetId } = req.query;
    const { hashFileName, originFileName, absolutePath, type } = uploadMetadata.runtime;
    const newFilePath = joinURL(getUploadDir(datasetId), hashFileName);

    await ensureKnowledgeDirExists(datasetId);
    await copyFile(absolutePath, newFilePath);

    const moveFile = async () => {
      await rm(absolutePath, { recursive: true, force: true });
    };

    const updateOrCreateDocument = async () => {
      const commonData = {
        error: null,
        name: originFileName,
        data: { type, path: hashFileName },
        updatedBy: req.user.did,
        embeddingStatus: 'idle',
      };

      if (documentId) {
        await DatasetDocument.update(commonData, { where: { id: documentId, datasetId } });
        const document = await DatasetDocument.findOne({ where: { id: documentId, datasetId } });
        if (document) queue.checkAndPush({ type: 'document', datasetId, documentId: document.id, update: true });
      } else {
        const document = await DatasetDocument.create({
          ...commonData,
          type: 'file',
          datasetId,
          createdBy: req.user.did,
        });
        await DatasetContent.create({ documentId: document.id, content: '' });
        if (document) queue.checkAndPush({ type: 'document', datasetId, documentId: document.id });
      }
    };

    // 延迟文件移动操作
    setTimeout(moveFile, 3000);

    // 立即更新或创建文档
    await updateOrCreateDocument();

    return uploadMetadata;
  },
});

router.use('/uploads', user(), localStorageServer.handle);

export default router;
