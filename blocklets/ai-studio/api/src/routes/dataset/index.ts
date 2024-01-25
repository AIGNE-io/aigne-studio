import { getBuildInDatasets } from '@blocklet/dataset-sdk';
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
 * /api/dataset/search:
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
 *      responses:
 *        200:
 *          description: 成功获取分页列表
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

/**
 * @openapi
 * /api/dataset/post-test:
 *    post:
 *      summary: 测试POST请求
 *      description: 测试POST请求
 *      parameters:
 *        - name: query
 *          in: query
 *          description: 搜索的内容
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *      requestBody:
 *        description: 测试POST请求
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                data:
 *                  type: string
 *                  description: 输出测试数据
 *      responses:
 *        "200":
 *          description: User created successfully
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  data:
 *                    type: string
 *                    description: The unique identifier of the created user
 *        "400":
 *          description: Bad Request - Incorrect request format, missing required fields, etc.
 *        "500":
 *          description: Internal Server Error - Something went wrong on the server side.
 */
router.post('/post-test', async (req, res) => {
  res.json({ role: 'system', content: `请根据内容回答： ${req.query.query} + ${req.body.data}` });
});

/**
 * @openapi
 * /api/dataset/search-test:
 *    get:
 *      type: 'SEARCH'
 *      summary: GET Current Weather
 *      description: 获取当前天气
 *      parameters:
 *        - name: city
 *          in: query
 *          description: 当前位置
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *      responses:
 *        200:
 *          description: 成功获取分页列表
 */
router.get('/search-test', async (req, res) => {
  res.json({ role: 'system', content: `当前 ${req.query.city} 的天气为 40 度` });
});

router.get('/list', async (_req, res) => {
  res.json({ list: await getBuildInDatasets(env.appUrl) });
});

export default router;
