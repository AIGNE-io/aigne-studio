import { getDatasetProtocols } from '@blocklet/dataset-sdk';
import { env } from '@blocklet/sdk/lib/config';
import { Router } from 'express';
import Joi from 'joi';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import VectorStore from '../../store/vector-store';

const router = Router();

const datasetSchema = Joi.object<{ vectorId: string; messageString: string }>({
  vectorId: Joi.string().required(),
  messageString: Joi.string().required(),
});

/**
 * @openapi
 * '/api/dataset/search':
 *    get:
 *      type: 'SEARCH'
 *      summary: 根据搜索内容搜索指定向量数据库的内容
 *      description: 根据搜索内容搜索指定向量数据库的内容
 *      parameters:
 *        - name: vectorId
 *          in: query
 *          description: 向量数据库的ID
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *        - name: messageString
 *          in: query
 *          description: 搜索的内容
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 */
router.get('/search', async (req, res) => {
  const input = await datasetSchema.validateAsync(req.query);
  const embeddings = new AIKitEmbeddings({});
  const store = await VectorStore.load(input.vectorId, embeddings);
  const docs = await store.similaritySearch(input.messageString, 4);

  const context = docs.map((i) => i.pageContent).join('\n');
  const contextTemplate = context
    ? `Use the following pieces of context to answer the users question.
  If you don't know the answer, just say that you don't know, don't try to make up an answer.
  ----------------
  ${context}`
    : '';

  res.json({ role: 'system', content: contextTemplate });
});

router.get('/list', async (_req, res) => {
  const list = await getDatasetProtocols(env.appUrl);
  res.json({ list });
});

export default router;
