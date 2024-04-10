import { readFile, writeFile } from 'fs/promises';
import path from 'path';

import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';
import multer from 'multer';
import { Op, Sequelize } from 'sequelize';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import { Config } from '../../libs/env';
import logger from '../../libs/logger';
import { userAuth } from '../../libs/user';
import DatasetContent from '../../store/models/dataset/content';
import Dataset from '../../store/models/dataset/dataset';
import DatasetDocument from '../../store/models/dataset/document';
import EmbeddingHistories from '../../store/models/dataset/embedding-history';
import VectorStore from '../../store/vector-store-hnswlib';
import { queue, updateHistoriesAndStore } from './embeddings';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

export interface CreateDiscussionItem {
  name: string;
  data: { type: 'discussion'; fullSite?: boolean; types?: ('discussion' | 'blog' | 'doc')[]; id: string };
}

export type CreateDiscussionItemInput = CreateDiscussionItem | CreateDiscussionItem[];

/**
 * @openapi
 * /api/datasets/{datasetId}/search:
 *    get:
 *      type: 'SEARCH'
 *      summary: Search for content within the dataset
 *      x-summary-zh: 搜索内容
 *      description: Search for specific content within the dataset by datasetId and search message
 *      x-description-zh: 搜索内容
 *      parameters:
 *        - name: datasetId
 *          in: path
 *          description: The ID of the dataset
 *          x-description-zh: 数据集的ID
 *          required: true
 *          x-parameter-type: input
 *          x-options-api: /ai-studio/api/datasets
 *          x-option-key: id
 *          x-option-name: name
 *          x-hide: true
 *          schema:
 *            type: string
 *            default: ''
 *        - name: message
 *          in: query
 *          description: The content to be retrieved
 *          x-description-zh: 需要检索的内容
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *      responses:
 *        200:
 *          description: Successfully retrieved the paginated list of search results
 *          x-description-zh: 成功获取分页列表
 */
router.get('/:datasetId/search', async (req, res) => {
  const { datasetId } = req.params;
  const datasetSchema = Joi.object<{ message: string }>({ message: Joi.string().required() });
  const input = await datasetSchema.validateAsync(req.query, { stripUnknown: true });

  const dataset = await Dataset.findOne({ where: { id: datasetId } });
  if (!dataset || !datasetId) {
    logger.error(
      'search vector info',
      datasetId ? `dataset with ${datasetId} is not found` : 'datasetId can not be empty'
    );
    res.json({ docs: [] });
    return;
  }

  const documents = await DatasetDocument.findAll({ where: { datasetId } });
  if (!documents?.length) {
    logger.error('search vector info', 'dataset documents is empty');
    res.json({ docs: [] });
    return;
  }

  const embeddings = new AIKitEmbeddings({});
  const store = await VectorStore.load(datasetId, embeddings);

  try {
    // const records = await UpdateHistories.findAll({ where: { datasetId }, attributes: ['segmentId'] });
    // const uniqueSegmentIds = [...new Set(records.map((record) => record.segmentId).flat())];

    // if (store.getMapping() && !Object.keys(store.getMapping()).length) {
    //   res.json({ docs: [] });
    //   return;
    // }

    const docs = await store.similaritySearch(input.message, 4);
    const result = docs.map((x) => {
      return {
        content: x?.pageContent,
        ...(x?.metadata?.metadata || {}),
      };
    });

    res.json({ docs: result });
  } catch (error) {
    logger.error('search vector info', error?.message);
    res.json({ docs: [] });
  }
});

/**
 * @openapi
 * /api/datasets/{datasetId}/documents:
 *    get:
 *      type: 'SEARCH'
 *      summary: Get data items in a dataset by datasetId
 *      x-summary-zh: 获取当前 datasetId 数据集中数据信息
 *      description: Get data items in a dataset by datasetId
 *      x-description-zh: 获取当前 datasetId 数据集中数据信息
 *      parameters:
 *        - name: datasetId
 *          in: path
 *          description: The ID of the dataset
 *          x-description-zh: 数据集的ID
 *          required: true
 *          x-parameter-type: input
 *          x-options-api: /ai-studio/api/datasets
 *          x-option-key: id
 *          x-option-name: name
 *          schema:
 *            type: string
 *            default: ''
 *        - name: page
 *          in: query
 *          description: The page number of the data
 *          x-description-zh: 当前数据页
 *          schema:
 *            type: integer
 *            default: 1
 *        - name: size
 *          in: query
 *          description: The number of items per page
 *          x-description-zh: 每页数据量
 *          schema:
 *            type: integer
 *            default: 20
 *      responses:
 *        200:
 *          description: Successfully retrieved data items in the dataset
 *          x-description-zh: 获取当前 datasetId 数据集中数据信息
 */
router.get('/:datasetId/documents', user(), userAuth(), async (req, res) => {
  const { did, isAdmin } = req.user!;
  const { datasetId } = req.params;
  const user = isAdmin ? {} : { [Op.or]: [{ createdBy: did }, { updatedBy: did }] };

  if (!datasetId) throw new Error('Missing required params `datasetId`');

  const { page, size } = await Joi.object<{ page: number; size: number }>({
    page: Joi.number().integer().min(1).default(1),
    size: Joi.number().integer().min(1).max(100).default(20),
  }).validateAsync(req.query, { stripUnknown: true });

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
  });
  await DatasetContent.create({ documentId: document.id, content });

  queue.checkAndPush({ type: 'document', documentId: document.id });

  res.json(document);
});

router.post('/:datasetId/documents/discussion', user(), async (req, res) => {
  const { datasetId } = req.params;

  const createItemsSchema = Joi.object({
    name: Joi.string().empty(['', null]),
    data: Joi.object({
      type: Joi.string().valid('discussion').required(),
      fullSite: Joi.boolean(),
      types: Joi.array().items(Joi.string()).sparse(false),
      id: Joi.string().empty(['', null]),
    })
      .required()
      .when('.fullSite', {
        is: true,
        then: Joi.object({
          types: Joi.array().items(Joi.string()).min(1).required(),
          id: Joi.any().optional(),
        }),
        otherwise: Joi.object({
          types: Joi.array().items(Joi.string()).sparse(true).default([]),
          id: Joi.string().required(),
        }),
      }),
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

  const createOrUpdate = async (name: string, id: string) => {
    const found = await DatasetDocument.findOne({ where: { datasetId, 'data.id': id } });
    if (found) {
      return found.update({ name, updatedBy: did }, { where: { datasetId, 'data.id': id } });
    }

    return DatasetDocument.create({
      type: 'discussion',
      data: { type: 'discussion', id },
      name,
      datasetId,
      createdBy: did,
      updatedBy: did,
    });
  };

  let docs: DatasetDocument[] = [];
  const fullSite = arr.find((x) => x.data?.fullSite);
  if (fullSite) {
    const document = await DatasetDocument.create({
      type: 'fullSite',
      data: {
        type: 'fullSite',
        ids: [],
        types: fullSite.data.types || [],
      },
      name: fullSite.name,
      datasetId,
      createdBy: did,
      updatedBy: did,
    });
    queue.checkAndPush({ type: 'document', documentId: document.id });

    return res.json(document);
  }

  docs = await Promise.all(
    arr.map(async (item) => {
      const document = await createOrUpdate(item.name, item.data.id);
      queue.checkAndPush({ type: 'document', documentId: document.id });
      return document;
    })
  );

  return res.json(Array.isArray(input) ? docs : docs[0]);
});

router.post('/:datasetId/documents/file', user(), userAuth(), upload.single('data'), async (req, res) => {
  const { did } = req.user!;
  const { datasetId } = req.params;
  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  if (!req?.file) {
    res.status(400).send('No file was uploaded.');
    return;
  }

  const { type, filename = req?.file.originalname, data = req?.file.buffer } = req.body;

  if (!type || !filename || !data) {
    res.status(500).json({ error: 'missing required body `type` or `filename` or `data`' });
    return;
  }

  let buffer = null;

  if (type === 'base64') {
    buffer = Buffer.from(data, 'base64');
  } else if (type === 'path') {
    buffer = await readFile(data);
  } else if (type === 'file') {
    buffer = data;
  } else {
    buffer = data;
  }

  if (!buffer) {
    res.json({ error: 'invalid upload type, should be [file, path, base64]' });
    return;
  }

  const filePath = path.join(Config.uploadDir, filename);
  await writeFile(filePath, buffer, 'utf8');

  const fileExtension = (path.extname(req.file.originalname) || '').replace('.', '');

  const document = await DatasetDocument.create({
    type: 'file',
    name: (req.file.originalname || '').replace(path.extname(req.file.originalname), ''),
    data: { type: fileExtension, path: filePath },
    datasetId,
    createdBy: did,
    updatedBy: did,
  });
  await DatasetContent.create({ documentId: document.id, content: await readFile(filePath, 'utf8') });

  queue.checkAndPush({ type: 'document', documentId: document.id });

  res.json(document);
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

  if (document) queue.checkAndPush({ type: 'document', documentId: document.id });

  res.json(document);
});

router.put('/:datasetId/documents/:documentId/file', user(), userAuth(), upload.single('data'), async (req, res) => {
  const { did } = req.user!;
  const { datasetId, documentId } = await Joi.object<{ datasetId: string; documentId: string }>({
    datasetId: Joi.string().required(),
    documentId: Joi.string().required(),
  }).validateAsync(req.params, { stripUnknown: true });

  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  if (!req?.file) {
    res.status(400).send('No file was uploaded.');
    return;
  }

  const { type, filename = req?.file.originalname, data = req?.file.buffer } = req.body;

  if (!type || !filename || !data) {
    res.status(500).json({ error: 'missing required body `type` or `filename` or `data`' });
    return;
  }

  let buffer = null;

  if (type === 'base64') {
    buffer = Buffer.from(data, 'base64');
  } else if (type === 'path') {
    buffer = await readFile(data, 'utf8');
  } else if (type === 'file') {
    buffer = data;
  } else {
    buffer = data;
  }

  if (!buffer) {
    res.json({ error: 'invalid upload type, should be [file, path, base64]' });
    return;
  }

  const filePath = path.join(Config.uploadDir, filename);
  await writeFile(filePath, buffer, 'utf8');

  const fileExtension = (path.extname(req.file.originalname) || '').replace('.', '');

  await DatasetDocument.update(
    {
      error: null,
      name: (req.file.originalname || '').replace(path.extname(req.file.originalname), ''),
      data: { type: fileExtension, path: filePath },
      updatedBy: did,
    },
    { where: { id: documentId, datasetId } }
  );
  await DatasetContent.update({ content: await readFile(filePath, 'utf8') }, { where: { documentId } });

  const document = await DatasetDocument.findOne({ where: { id: documentId, datasetId } });

  if (document) queue.checkAndPush({ type: 'document', documentId: document.id });

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

router.post('/:datasetId/documents/:documentId/embedding', user(), userAuth(), async (req, res) => {
  const { documentId } = await Joi.object<{ documentId: string }>({
    documentId: Joi.string().required(),
  }).validateAsync(req.params, { stripUnknown: true });

  const [document] = await Promise.all([DatasetDocument.findOne({ where: { id: documentId } })]);

  if (document) queue.checkAndPush({ type: 'document', documentId: document.id });

  res.json(document);
});

export default router;
