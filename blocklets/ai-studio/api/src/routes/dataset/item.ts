import fs from 'fs';
import path from 'path';

import { getComponentWebEndpoint } from '@blocklet/sdk/lib/component';
import user from '@blocklet/sdk/lib/middlewares/user';
import axios from 'axios';
import { Router } from 'express';
import SSE from 'express-sse';
import Joi from 'joi';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import multer from 'multer';
import { Op } from 'sequelize';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import { Config } from '../../libs/env';
import { ensureComponentCallOrPromptsEditor } from '../../libs/security';
import { checkUserAuth } from '../../libs/user';
import DatasetItem from '../../store/models/dataset/item';
import Dataset from '../../store/models/dataset/list';
import VectorStore from '../../store/vector-store';

const router = Router();
const sse = new SSE();
const embeddingTasks = new Map<string, { promise: Promise<void>; current?: number; total?: number }>();
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

router.get('/:datasetId/items', user(), checkUserAuth(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
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

router.delete(
  '/:datasetId/items/:itemId',
  user(),
  checkUserAuth(),
  ensureComponentCallOrPromptsEditor(),
  async (req, res) => {
    const { did } = req.user!;
    const { datasetId, itemId } = req.params;

    if (!datasetId || !itemId) {
      throw new Error('Missing required params `datasetId` or `itemId`');
    }

    await DatasetItem.destroy({ where: { id: itemId, datasetId } });

    await resetDatasetsEmbedding(datasetId, did);

    res.json({ data: 'success' });
  }
);

const embeddingHandler: {
  [key in NonNullable<DatasetItem['type']>]: (
    item: DatasetItem & { data: { type: key } }
  ) => Promise<{ name: string; content: string }>;
} = {
  discussion: async (item: DatasetItem) => {
    const discussion = await getDiscussion((item.data as any).id);
    await saveContentToVectorStore(discussion.content, item.datasetId);
    return { name: discussion.title, content: discussion.content };
  },
  text: async (item: DatasetItem) => {
    const content = (item.data as any)?.content;
    await saveContentToVectorStore(content, item.datasetId);

    return { name: content.slice(0, 10), content };
  },
  markdown: async (item: DatasetItem) => {
    const content = fs.readFileSync((item.data as any).path, 'utf8');
    await saveContentToVectorStore(content, item.datasetId);

    return { name: content.slice(0, 10), content };
  },
  txt: async (item: DatasetItem) => {
    const content = fs.readFileSync((item.data as any).path, 'utf8');
    await saveContentToVectorStore(content, item.datasetId);

    return { name: content.slice(0, 10), content };
  },
  pdf: async (item: DatasetItem) => {
    const content = fs.readFileSync((item.data as any).path, 'utf8');
    await saveContentToVectorStore(content, item.datasetId);

    return { name: content.slice(0, 10), content };
  },
};

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

router.post(
  '/:datasetId/items/embedding',
  user(),
  checkUserAuth(),
  ensureComponentCallOrPromptsEditor(),
  async (req, res) => {
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
      type: input.type,
      data,
      datasetId,
      createdBy: did,
      updatedBy: did,
    });

    const itemId = result.dataValues.id;
    await runHandlerAndSaveContent(itemId);

    res.json({ data: 'success' });
  }
);

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

router.post(
  '/:datasetId/items/file',
  user(),
  checkUserAuth(),
  ensureComponentCallOrPromptsEditor(),
  upload.single('data'),
  async (req, res) => {
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
      res.json({ error: 'missing required body `type` or `filename` or `data`' });
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

    const fileExtension = (path.extname(req.file.originalname) || '').replace('.', '') as 'markdown' | 'txt' | 'pdf';

    const result = await DatasetItem.create({
      type: fileExtension,
      data: { type: fileExtension, path: filePath },
      datasetId,
      createdBy: did,
      updatedBy: did,
    });
    const itemId = result.dataValues.id;
    await runHandlerAndSaveContent(itemId);

    res.json({ data: 'success' });
  }
);

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

router.put(
  '/:datasetId/items/:itemId/embedding',
  user(),
  checkUserAuth(),
  ensureComponentCallOrPromptsEditor(),
  async (req, res) => {
    const { did } = req.user! || {};
    const { datasetId, itemId } = req.params;
    if (!datasetId) {
      throw new Error('Missing required params `datasetId`');
    }

    const input = await createItemSchema.validateAsync(req.body, { stripUnknown: true });
    const data =
      input.type === 'text'
        ? { type: input.type, content: input.data || '' }
        : { type: input.type, id: input.data || '' };

    await DatasetItem.update(
      { error: '', type: input.type, data, updatedBy: did },
      { where: { id: itemId, datasetId } }
    );

    await resetDatasetsEmbedding(datasetId, did);

    res.json({ data: 'success' });
  }
);

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
router.put(
  '/:datasetId/items/:itemId/file',
  user(),
  checkUserAuth(),
  ensureComponentCallOrPromptsEditor(),
  upload.single('data'),
  async (req, res) => {
    const { did } = req.user!;
    const { datasetId, itemId } = req.params;
    if (!datasetId) {
      throw new Error('Missing required params `datasetId`');
    }

    if (!req?.file) {
      res.status(400).send('No file was uploaded.');
      return;
    }

    const { type, filename = req?.file.originalname, data = req?.file.buffer } = req.body;

    if (!type || !filename || !data) {
      res.json({ error: 'missing required body `type` or `filename` or `data`' });
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

    const fileExtension = (path.extname(req.file.originalname) || '').replace('.', '') as 'markdown' | 'txt' | 'pdf';

    await DatasetItem.update(
      { error: '', type: fileExtension, data: { type: fileExtension, path: filePath }, updatedBy: did },
      { where: { id: itemId, datasetId } }
    );

    await resetDatasetsEmbedding(datasetId, did);

    res.json({ data: 'success' });
  }
);

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

router.get(
  '/:datasetId/items/search',
  user(),
  checkUserAuth(),
  ensureComponentCallOrPromptsEditor(),
  async (req, res) => {
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
  }
);

export default router;

const discussBaseUrl = () => {
  const url = getComponentWebEndpoint('z8ia1WEiBZ7hxURf6LwH21Wpg99vophFwSJdu');
  if (!url) {
    throw new Error('did-comments component not found');
  }

  return url;
};

async function getDiscussion(discussionId: string): Promise<{ content: string; updatedAt: string; title: string }> {
  const { data } = await axios.get(`/api/blogs/${discussionId}`, {
    baseURL: discussBaseUrl(),
    params: { textContent: 1 },
  });

  if (!data) {
    throw new Error('Discussion not found');
  }

  return data;
}

const saveContentToVectorStore = async (content: string, datasetId: string) => {
  const textSplitter = new RecursiveCharacterTextSplitter();
  const docs = await textSplitter.createDocuments([content]);
  const embeddings = new AIKitEmbeddings({});
  const vectors = await embeddings.embedDocuments(docs.map((d) => d.pageContent));
  const store = await VectorStore.load(datasetId, embeddings);
  await store.addVectors(vectors, docs);
  await store.save();
};

const runHandlerAndSaveContent = async (itemId: string) => {
  let task = embeddingTasks.get(itemId);
  if (!task) {
    task = {
      promise: (async () => {
        const item = await DatasetItem.findOne({ where: { id: itemId } });
        if (!item) throw new Error(`Dataset item ${itemId} not found`);
        if (!item.data) return;

        const handler = embeddingHandler[item.type];
        if (!handler) return;

        try {
          const { name, content } = await handler(item as any);
          await DatasetItem.update({ error: '', content, name }, { where: { id: itemId } });
        } catch (error) {
          await DatasetItem.update({ error: error.message }, { where: { id: itemId } });

          throw error;
        } finally {
          embeddingTasks.delete(itemId);
          sse.send({ itemId }, 'complete');
        }
      })(),
    };

    embeddingTasks.set(itemId, task);
    sse.send({ itemId }, 'change');
  }

  await task.promise;
};

const resetDatasetsEmbedding = async (datasetId: string, did: string) => {
  const datasetItems = await DatasetItem.findAll({ where: { datasetId, createdBy: did } });
  if (!datasetItems?.length) return;

  await VectorStore.remove(datasetId);

  // 使用同步还是异步？
  datasetItems.forEach(async (item) => {
    const handler = embeddingHandler[item.type];
    if (!handler) return;

    // eslint-disable-next-line no-await-in-loop
    await handler(item as any);
  });
};
