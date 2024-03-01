import fs from 'fs';
import path from 'path';

import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';
import multer from 'multer';
import { Op } from 'sequelize';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import { Config } from '../../libs/env';
import { checkUserAuth } from '../../libs/user';
import Dataset from '../../store/models/dataset/dataset';
import DatasetItem from '../../store/models/dataset/document';
import VectorStore from '../../store/vector-store';
import { runHandlerAndSaveContent } from './embeddings';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const paginationSchema = Joi.object<{ page: number; size: number }>({
  page: Joi.number().integer().min(1).default(1),
  size: Joi.number().integer().min(1).max(100).default(20),
});

const createItemSchema = Joi.object<{
  type: 'text' | 'discussion';
  data: string;
}>({
  type: Joi.string().valid('text', 'discussion').required(),
  data: Joi.string().required(),
});

const idSchema = Joi.object<{
  datasetId: string;
  itemId: string;
}>({
  datasetId: Joi.string().required(),
  itemId: Joi.string().required(),
});

/**
 * @openapi
 * /api/dataset/{datasetId}/items:
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

router.get('/:datasetId/items', user(), checkUserAuth(), async (req, res) => {
  const { did } = req.user!;
  const { datasetId } = req.params;

  if (!datasetId) throw new Error('Missing required params `datasetId`');

  const { page, size } = await paginationSchema.validateAsync(req.query, { stripUnknown: true });

  const [items, total] = await Promise.all([
    DatasetItem.findAll({
      order: [['createdAt', 'ASC']],
      where: { datasetId, [Op.or]: [{ createdBy: did }, { updatedBy: did }] },
      offset: (page - 1) * size,
      limit: size,
    }),
    DatasetItem.count({ where: { datasetId, [Op.or]: [{ createdBy: did }, { updatedBy: did }] } }),
  ]);

  res.json({ items, total });
});

/**
 * @openapi
 * /api/dataset/{datasetId}/items/{itemId}:
 *    delete:
 *      type: 'SEARCH'
 *      summary: Delete a data item from the dataset by datasetId and itemId
 *      x-summary-zh: 删除当前 datasetId 数据集中数据信息
 *      description: Delete a data item from the dataset by datasetId and itemId
 *      x-description-zh: 删除当前 datasetId 数据集中数据信息
 *      parameters:
 *        - name: datasetId
 *          in: path
 *          description: The ID of the dataset
 *          x-description-zh: 数据集的ID
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *        - name: itemId
 *          in: path
 *          description: The ID of the data item
 *          x-description-zh: 数据ID
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *      responses:
 *        200:
 *          description: Successfully deleted the data item from the dataset
 *          x-description-zh: 删除当前 datasetId 数据集中数据信息
 */

router.delete('/:datasetId/:itemId', user(), checkUserAuth(), async (req, res) => {
  const { datasetId, itemId } = await idSchema.validateAsync(req.params, { stripUnknown: true });

  if (!datasetId || !itemId) {
    throw new Error('Missing required params `datasetId` or `itemId`');
  }

  await DatasetItem.destroy({ where: { id: itemId, datasetId } });

  res.json({ data: 'success' });
});

router.post('/:datasetId/create', user(), checkUserAuth(), async (req, res) => {
  const { did } = req.user!;
  const { datasetId } = req.params;

  const input = await Joi.object<{ type: 'discussion' | 'text' | 'md' | 'txt' | 'pdf' | 'doc'; name: string }>({
    type: Joi.string().valid('discussion', 'text', 'md', 'txt', 'pdf', 'doc').required(),
    name: Joi.string().required(),
  }).validateAsync(req.body, { stripUnknown: true });

  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  const { type, name } = input;

  const document = await DatasetItem.create({
    type,
    name,
    datasetId,
    createdBy: did,
    updatedBy: did,
  });

  res.json(document);
});

/**
 * @openapi
 * /api/dataset/{datasetId}/items/embedding:
 *    post:
 *      type: 'CREATE'
 *      summary: Upload data to the specified dataset by datasetId
 *      x-summary-zh: 上传数据到当前 datasetId 数据集中
 *      description: Upload data to the specified dataset by datasetId
 *      x-description-zh: 上传数据到当前 datasetId 数据集中
 *      parameters:
 *        - name: datasetId
 *          in: path
 *          description: The ID of the dataset
 *          x-description-zh: 数据集的ID
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                type:
 *                  type: string
 *                data:
 *                  type: string
 *      responses:
 *        200:
 *          description: Successfully uploaded data to the dataset
 *          x-description-zh: 上传数据到当前 datasetId 数据集中
 */

router.post('/:datasetId/items/embedding', user(), checkUserAuth(), async (req, res) => {
  const { did } = req.user!;
  const { datasetId } = req.params;
  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  const input = await createItemSchema.validateAsync(req.body, { stripUnknown: true });
  const data =
    input.type === 'text'
      ? { type: input.type, content: input.data || '' }
      : { type: input.type, id: input.data || '' };

  const result = await DatasetItem.create({
    name: (input.data || '').slice(0, 10),
    type: input.type,
    data,
    datasetId,
    createdBy: did,
    updatedBy: did,
  });

  const itemId = result.dataValues.id;
  await runHandlerAndSaveContent(itemId);

  res.json({ data: 'success' });
});

/**
 * @openapi
 * /api/dataset/{datasetId}/items/file:
 *    post:
 *      type: 'CREATE'
 *      summary: Upload a file to the specified dataset by datasetId
 *      x-summary-zh: 上传文件到当前 datasetId 数据集中
 *      description: Upload a file to the specified dataset by datasetId
 *      x-description-zh: 上传文件到当前 datasetId 数据集中
 *      parameters:
 *        - name: datasetId
 *          in: path
 *          description: The ID of the dataset
 *          x-description-zh: 数据集的ID
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *      requestBody:
 *        content:
 *          multipart/form-data:
 *            schema:
 *             type: object
 *             properties:
 *                data:
 *                 type: string
 *                 format: binary
 *                type:
 *                 type: string
 *                 default: 'file'
 *      responses:
 *        200:
 *          description: File successfully uploaded to the specified dataset
 *          x-description-zh: 上传文件到当前 datasetId 数据集中
 */

router.post('/:datasetId/items/file', user(), checkUserAuth(), upload.single('data'), async (req, res) => {
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
    buffer = fs.readFileSync(data);
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
  fs.writeFileSync(filePath, buffer, 'utf8');

  const fileExtension = (path.extname(req.file.originalname) || '').replace('.', '') as 'md' | 'txt' | 'pdf' | 'doc';

  const result = await DatasetItem.create({
    name: (req.file.originalname || '').replace(path.extname(req.file.originalname), ''),
    type: fileExtension,
    data: { type: fileExtension, path: filePath },
    datasetId,
    createdBy: did,
    updatedBy: did,
  });
  const itemId = result.dataValues.id;
  await runHandlerAndSaveContent(itemId);

  res.json({ data: 'success' });
});

/**
 * @openapi
 * /api/dataset/{datasetId}/items/{itemId}/embedding:
 *    put:
 *      type: 'UPDATE'
 *      summary: Update data in the specified dataset by datasetId and itemId
 *      x-summary-zh: 更新数据到当前 datasetId 数据集中
 *      description: Update data in the specified dataset by datasetId and itemId
 *      x-description-zh: 更新数据到当前 datasetId 数据集中
 *      parameters:
 *        - name: datasetId
 *          in: path
 *          description: The ID of the dataset
 *          x-description-zh: 数据集 Id
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *        - name: itemId
 *          in: path
 *          description: The ID of the data item
 *          x-description-zh: 数据 Id
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                type:
 *                  type: string
 *                data:
 *                  type: string
 *      responses:
 *        200:
 *          description: Successfully updated the data in the dataset
 *          x-description-zh: 更新数据到当前 datasetId 数据集中
 */

router.put('/:datasetId/items/:itemId/embedding', user(), checkUserAuth(), async (req, res) => {
  const { did } = req.user! || {};
  const { datasetId, itemId } = await idSchema.validateAsync(req.params, { stripUnknown: true });

  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  const input = await createItemSchema.validateAsync(req.body, { stripUnknown: true });
  const data =
    input.type === 'text'
      ? { type: input.type, content: input.data || '' }
      : { type: input.type, id: input.data || '' };

  await DatasetItem.update({ error: '', type: input.type, data, updatedBy: did }, { where: { id: itemId, datasetId } });

  // await resetDatasetsEmbedding(datasetId, did, itemId);

  res.json({ data: 'success' });
});

/**
 * @openapi
 * /api/dataset/{datasetId}/items/{itemId}/file:
 *    put:
 *      type: 'UPDATE'
 *      summary: Update an uploaded file in the dataset by datasetId
 *      x-summary-zh: 更新上传到当前 datasetId 数据集中
 *      description: Update an uploaded file in the dataset by datasetId and itemId
 *      x-description-zh: 更新上传到当前 datasetId 数据集中
 *      parameters:
 *        - name: datasetId
 *          in: path
 *          description: The ID of the dataset
 *          x-description-zh: 数据集 Id
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *        - name: itemId
 *          in: path
 *          description: The ID of the data item
 *          x-description-zh: 数据 Id
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *      requestBody:
 *        content:
 *          multipart/form-data:
 *            schema:
 *             type: object
 *             properties:
 *                data:
 *                 type: string
 *                 format: binary
 *                type:
 *                 type: string
 *                 default: 'file'
 *      responses:
 *        200:
 *          description: Successfully updated the uploaded file in the dataset
 *          x-description-zh: 更新上传到当前 datasetId 数据集中
 */
router.put('/:datasetId/items/:itemId/file', user(), checkUserAuth(), upload.single('data'), async (req, res) => {
  const { did } = req.user!;
  const { datasetId, itemId } = await idSchema.validateAsync(req.params, { stripUnknown: true });

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
    buffer = fs.readFileSync(data);
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
  fs.writeFileSync(filePath, buffer, 'utf8');

  const fileExtension = (path.extname(req.file.originalname) || '').replace('.', '') as 'md' | 'txt' | 'pdf' | 'doc';

  await DatasetItem.update(
    { error: '', type: fileExtension, data: { type: fileExtension, path: filePath }, updatedBy: did },
    { where: { id: itemId, datasetId } }
  );

  // await resetDatasetsEmbedding(datasetId, did, itemId);

  res.json({ data: 'success' });
});

/**
 * @openapi
 * /api/dataset/{datasetId}/items/search:
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
 *          schema:
 *            type: string
 *            default: ''
 *        - name: message
 *          in: query
 *          description: The search content or message
 *          x-description-zh: 搜索的内容
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *      responses:
 *        200:
 *          description: Successfully retrieved the paginated list of search results
 *          x-description-zh: 成功获取分页列表
 */

router.get('/:datasetId/items/search', user(), checkUserAuth(), async (req, res) => {
  const { did } = req.user!;
  const { datasetId } = req.params;
  const datasetSchema = Joi.object<{ message: string }>({ message: Joi.string().required() });
  const input = await datasetSchema.validateAsync(req.query);

  const dataset = await Dataset.findOne({
    where: { id: datasetId, [Op.or]: [{ createdBy: did }, { updatedBy: did }] },
  });
  if (!dataset || !datasetId) {
    res.json({ role: 'system', content: '' });
    return;
  }

  const datasetItems = await DatasetItem.findAll({
    where: { datasetId, [Op.or]: [{ createdBy: did }, { updatedBy: did }] },
  });
  if (!datasetItems?.length) {
    res.json({ role: 'system', content: '' });
    return;
  }

  const embeddings = new AIKitEmbeddings({});
  const store = await VectorStore.load(datasetId, embeddings);
  const docs = await store.similaritySearch(input.message, 4);

  const context = docs.map((i) => i.pageContent).join('\n');
  const contextTemplate = context
    ? `Use the following pieces of context to answer the users question.
  If you don't know the answer, just say that you don't know, don't try to make up an answer.
  ----------------
  ${context}`
    : '';

  res.json({ role: 'system', content: contextTemplate });
});

router.get('/:datasetId/:documentId', user(), checkUserAuth(), async (req, res) => {
  const { did } = req.user!;

  const input = await Joi.object<{ datasetId: string; documentId: string }>({
    datasetId: Joi.string().required(),
    documentId: Joi.string().required(),
  }).validateAsync(req.params);

  const { datasetId, documentId } = input;

  const dataset = await Dataset.findOne({
    where: { id: datasetId, [Op.or]: [{ createdBy: did }, { updatedBy: did }] },
  });

  const document = await DatasetItem.findOne({ where: { datasetId, id: documentId } });

  res.json({ dataset, document });
});

export interface CreateItem {
  name: string;
  data: { type: 'discussion'; id: string };
}

export type CreateItemInput = CreateItem | CreateItem[];

const createItemsSchema = Joi.object<CreateItem>({
  name: Joi.string().required(),
  data: Joi.object({
    type: Joi.string().valid('discussion').required(),
  })
    .when(Joi.object({ type: 'discussion' }).unknown(), {
      then: Joi.object({
        id: Joi.string(),
      }),
    })
    .required(),
});

const createItemInputSchema = Joi.alternatives<CreateItemInput>().try(
  Joi.array().items(createItemsSchema),
  createItemsSchema
);

router.post('/:datasetId/items', user(), async (req, res) => {
  const { datasetId } = req.params;
  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  const input = await createItemInputSchema.validateAsync(req.body, { stripUnknown: true });
  const { did } = req.user!;

  const arr = Array.isArray(input) ? input : [input];

  const docs = await Promise.all(
    arr.map(async (item) => {
      const { data, name } = item;
      const found = await DatasetItem.findOne({ where: { datasetId, data } });
      if (found) {
        return found.update({ name, data, createdBy: did, updatedBy: did }, { where: { datasetId, data } });
      }

      return DatasetItem.create({
        type: 'discussion',
        name,
        data,
        datasetId,
        createdBy: did,
        updatedBy: did,
      });
    })
  );

  docs.forEach((doc) => runHandlerAndSaveContent(doc.id));

  res.json(Array.isArray(input) ? docs : docs[0]);
});

export default router;
