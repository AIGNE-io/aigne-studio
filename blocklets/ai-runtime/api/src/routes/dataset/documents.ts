import { copyFile, rm } from 'fs/promises';
import { join } from 'path';

import { resourceManager } from '@api/libs/resource';
import middlewares from '@blocklet/sdk/lib/middlewares';
// @ts-ignore
import { initLocalStorageServer } from '@blocklet/uploader-server';
import express, { Router } from 'express';
import { exists, pathExists } from 'fs-extra';
import Joi from 'joi';
import { sortBy } from 'lodash';
import { Op } from 'sequelize';
import { joinURL } from 'ufo';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import ensureKnowledgeDirExists, { getSourceFileDir } from '../../libs/ensure-dir';
import { Config } from '../../libs/env';
import logger from '../../libs/logger';
import { userAuth } from '../../libs/security';
import Dataset from '../../store/models/dataset/dataset';
import DatasetDocument from '../../store/models/dataset/document';
import EmbeddingHistories from '../../store/models/dataset/embedding-history';
import VectorStore from '../../store/vector-store-faiss';
import getAllContents, { getAllResourceContents } from './content';
import { queue } from './embeddings';
import { updateHistoriesAndStore } from './util/vector-store';

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

const getDocumentsSchema = Joi.object<{ blockletDid?: string; page: number; size: number }>({
  blockletDid: Joi.string().empty(['', null]),
  page: Joi.number().integer().min(1).default(1),
  size: Joi.number().integer().min(1).max(100).default(20),
});

const documentIdSchema = Joi.object<{ knowledgeId: string; documentId: string }>({
  knowledgeId: Joi.string().required(),
  documentId: Joi.string().required(),
});

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
  const vectorPath = (await pathExists(join(resource.vectorsPath, 'faiss.index')))
    ? resource.vectorsPath
    : join(resource.vectorsPath, knowledgeId);
  const store = await VectorStore.load(vectorPath, embeddings);

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

  const embeddings = new AIKitEmbeddings({});
  const store = await VectorStore.load(datasetId, embeddings);

  if (store.getMapping() && !Object.keys(store.getMapping()).length) {
    logger.error('store get mapping is empty');
    res.json({ docs: [] });
    return;
  }

  const docs = await store.similaritySearchWithScore(
    // Allow empty query to get some random results
    input.message || ' ',
    Math.min(input.n, Object.keys(store.getMapping()).length)
  );

  // 分数越低越相近
  const result = sortBy(docs, (item) => item[1]).map((x) => {
    const info = x[0] || {};
    return { content: info?.pageContent, ...(info?.metadata?.metadata || {}) };
  });

  res.json({ docs: result });
});

router.get('/:knowledgeId/documents', middlewares.session(), userAuth(), async (req, res) => {
  const { did, isAdmin } = req.user!;
  const { knowledgeId } = req.params;
  const user = isAdmin ? {} : { [Op.or]: [{ createdBy: did }, { updatedBy: did }] };

  if (!knowledgeId) throw new Error('Missing required params `knowledgeId`');

  const { blockletDid, page, size } = await getDocumentsSchema.validateAsync(req.query, { stripUnknown: true });

  if (blockletDid) {
    const knowledge = await resourceManager.getKnowledge({ blockletDid, knowledgeId });
    const docs = [...(knowledge?.documents || [])].splice(page - 1, size);
    res.json({ items: docs, total: knowledge?.documents.length });
    return;
  }

  const params = { datasetId: knowledgeId, ...user };
  const [items, total] = await Promise.all([
    DatasetDocument.findAll({ order: [['createdAt', 'DESC']], where: params, offset: (page - 1) * size, limit: size }),
    DatasetDocument.count({ where: params }),
  ]);

  res.json({ items, total, page });
});

router.delete('/:knowledgeId/documents/:documentId', middlewares.session(), userAuth(), async (req, res) => {
  const { knowledgeId, documentId } = await documentIdSchema.validateAsync(req.params, { stripUnknown: true });

  const document = DatasetDocument.findOne({ where: { id: documentId, datasetId: knowledgeId } });

  await updateHistoriesAndStore(knowledgeId, documentId);

  await Promise.all([
    DatasetDocument.destroy({ where: { id: documentId, datasetId: knowledgeId } }),
    EmbeddingHistories.destroy({ where: { documentId, datasetId: knowledgeId } }),
  ]);

  res.json(document);
});

router.post('/:knowledgeId/documents/file', middlewares.session(), userAuth(), async (req, res) => {
  const { did } = req.user!;
  const { knowledgeId } = req.params;

  if (!knowledgeId) {
    throw new Error('Missing required params `knowledgeId`');
  }

  const { name, hash, size, type, relativePath } = await Joi.object<{
    hash: string;
    name: string;
    size: number;
    type: string;
    relativePath: string;
  }>({
    hash: Joi.string().required(),
    name: Joi.string().allow('').default(''),
    size: Joi.number().required(),
    type: Joi.string().required(),
    relativePath: Joi.string().required(),
  }).validateAsync(req.body, { stripUnknown: true });

  const newFilePath = joinURL(getSourceFileDir(knowledgeId), hash);

  if (!(await exists(newFilePath))) {
    throw new Error(`file ${newFilePath} not found`);
  }

  const document = await DatasetDocument.create({
    type: 'file',
    name,
    datasetId: knowledgeId,
    createdBy: did,
    updatedBy: did,
    embeddingStatus: 'idle',
    path: hash,
    size,
    data: {
      type: 'file',
      name,
      hash,
      size,
      fileType: type,
      relativePath,
    },
  });

  queue.checkAndPush({ type: 'document', datasetId: knowledgeId, documentId: document.id });

  res.json(document);
});

router.post('/:knowledgeId/documents/custom', middlewares.session(), userAuth(), async (req, res) => {
  const { did } = req.user!;
  const { knowledgeId } = req.params;

  if (!knowledgeId) {
    throw new Error('Missing required params `knowledgeId`');
  }

  const { title, content } = await Joi.object<{ title: string; content: string }>({
    title: Joi.string().required(),
    content: Joi.string().required(),
  }).validateAsync(req.body, { stripUnknown: true });

  const document = await DatasetDocument.create({
    type: 'text',
    name: title,
    datasetId: knowledgeId,
    createdBy: did,
    updatedBy: did,
    embeddingStatus: 'idle',
    path: '',
    size: 0,
    data: {
      type: 'text',
      title,
      content,
    },
  });

  queue.checkAndPush({ type: 'document', datasetId: knowledgeId, documentId: document.id });

  res.json(document);
});

router.post('/:knowledgeId/documents/discussion', middlewares.session(), async (req, res) => {
  const { knowledgeId } = req.params;

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

  if (!knowledgeId) {
    throw new Error('Missing required params `knowledgeId`');
  }

  const input = await createItemInputSchema.validateAsync(req.body, { stripUnknown: true });
  const { did } = req.user!;

  const arr = Array.isArray(input) ? input : [input];

  const createOrUpdate = async (name: string, data: CreateDiscussionItem['data']) => {
    const found = await DatasetDocument.findOne({
      where: { datasetId: knowledgeId, 'data.id': data.id, 'data.from': data.from },
    });

    if (found) {
      return found.update(
        { name, updatedBy: did },
        { where: { datasetId: knowledgeId, 'data.id': data.id, 'data.from': data.from } }
      );
    }

    return DatasetDocument.create({
      name,
      type: 'discussKit',
      data: { type: 'discussKit', data },
      datasetId: knowledgeId,
      createdBy: did,
      updatedBy: did,
      embeddingStatus: 'idle',
    });
  };

  const docs = await Promise.all(
    arr.map(async (item) => {
      const document = await createOrUpdate(item.name, item.data);
      queue.checkAndPush({ type: 'document', datasetId: knowledgeId, documentId: document.id });
      return document;
    })
  );

  return res.json(Array.isArray(input) ? docs : docs[0]);
});

router.post('/:knowledgeId/documents/crawl', middlewares.session(), userAuth(), async (req, res) => {
  const { did } = req.user!;
  const { knowledgeId } = req.params;

  if (!knowledgeId) {
    throw new Error('Missing required params `knowledgeId`');
  }

  const { provider, url, apiKey } = await Joi.object<{ provider: 'jina' | 'firecrawl'; url: string; apiKey: string }>({
    provider: Joi.string().valid('jina', 'firecrawl').required(),
    url: Joi.string().required(),
    apiKey: Joi.string().allow('', null).default(''),
  }).validateAsync(req.body, { stripUnknown: true });

  const document = await DatasetDocument.create({
    type: 'crawl',
    name: '',
    datasetId: knowledgeId,
    createdBy: did,
    updatedBy: did,
    embeddingStatus: 'idle',
    path: '',
    size: 0,
    data: {
      type: 'crawl',
      provider,
      url,
      apiKey,
    },
  });

  queue.checkAndPush({ type: 'document', datasetId: knowledgeId, documentId: document.id });

  res.json(document);
});

router.get('/:knowledgeId/documents/:documentId', middlewares.session(), userAuth(), async (req, res) => {
  const { did, isAdmin } = req.user!;
  const user = isAdmin ? {} : { [Op.or]: [{ createdBy: did }, { updatedBy: did }] };

  const { knowledgeId, documentId } = await Joi.object<{ knowledgeId: string; documentId: string }>({
    knowledgeId: Joi.string().required(),
    documentId: Joi.string().required(),
  }).validateAsync(req.params);

  const [dataset, document] = await Promise.all([
    Dataset.findOne({ where: { id: knowledgeId, ...user } }),
    DatasetDocument.findOne({ where: { datasetId: knowledgeId, id: documentId } }),
  ]);

  res.json({ dataset, document });
});

router.post('/:knowledgeId/documents/:documentId/embedding', middlewares.session(), userAuth(), async (req, res) => {
  const { knowledgeId, documentId } = await documentIdSchema.validateAsync(req.params, { stripUnknown: true });

  const [document] = await Promise.all([DatasetDocument.findOne({ where: { id: documentId } })]);
  if (document) queue.checkAndPush({ type: 'document', datasetId: knowledgeId, documentId: document.id });
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

    return {
      ...uploadMetadata,
      newFilePath,
    };
  },
});
router.use('/upload-document', middlewares.session(), localStorageServer.handle);

export default router;
