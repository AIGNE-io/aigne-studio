import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';

import { ensureComponentCallOrAuth } from '../libs/security';
import Datastore from '../store/models/datastore';

const router = Router();

const getDatastoreSchema = Joi.object<{
  userId?: string;
  sessionId?: string;
  assistantId?: string;
  projectId?: string;
  dataType?: string;
  scope?: string;
  key: string;
}>({
  userId: Joi.string().empty([null, '']),
  sessionId: Joi.string().empty([null, '']),
  assistantId: Joi.string().empty([null, '']),
  projectId: Joi.string().empty([null, '']),
  dataType: Joi.string().empty([null, '']),
  scope: Joi.string().empty([null, '']),
  key: Joi.string().required(),
});

const postDatastoreSchema = Joi.object<{
  key: string;
  scope: 'user' | 'session' | 'global';
  dataType: string;
  data: any;
}>({
  key: Joi.string().required(),
  data: Joi.any(),
  scope: Joi.string().empty([null, '']),
  dataType: Joi.string().empty([null, '']),
});

const postParamsSchema = Joi.object<{
  userId?: string;
  sessionId?: string;
  assistantId?: string;
  projectId?: string;
  reset: boolean;
}>({
  userId: Joi.string().empty([null, '']),
  sessionId: Joi.string().empty([null, '']),
  assistantId: Joi.string().empty([null, '']),
  projectId: Joi.string().empty([null, '']),
  reset: Joi.boolean().default(false),
});

const putParamsSchema = Joi.object<{
  userId?: string;
  sessionId?: string;
  assistantId?: string;
  projectId?: string;
  key?: string;
  id?: string;
  dataType?: string;
  scope?: string;
}>({
  id: Joi.string().allow('').empty([null, '']).optional(),
  key: Joi.string().allow('').empty([null, '']).optional(),
  userId: Joi.string().empty([null, '']),
  sessionId: Joi.string().empty([null, '']),
  assistantId: Joi.string().empty([null, '']),
  projectId: Joi.string().empty([null, '']),
  dataType: Joi.string().empty([null, '']),
  scope: Joi.string().empty([null, '']),
});

const getVariableSchema = Joi.object<{
  offset?: number;
  limit?: number;
  key: string;
  scope: string;
  projectId?: string;
  userId?: string;
  sessionId?: string;
  assistantId?: string;
  dataType: string;
}>({
  offset: Joi.number().integer().min(0).empty([null, '']).default(0).optional(),
  limit: Joi.number().integer().min(1).empty([null, '']).default(5).optional(),
  key: Joi.string().allow('').empty([null, '']).default(''),
  scope: Joi.string().valid('global', 'session', 'user').default('global').required(),
  userId: Joi.string().empty([null, '']),
  sessionId: Joi.string().empty([null, '']),
  assistantId: Joi.string().empty([null, '']),
  projectId: Joi.string().empty([null, '']),
  dataType: Joi.string().allow('').empty([null, '']).required(),
});

/**
 * @openapi
 * /api/datastore:
 *   get:
 *     summary: Get datastores
 *     description: Retrieve a list of datastores with optional query parameters to filter the results.
 *     x-summary-zh: 获取数据存储
 *     x-description-zh: 使用可选的查询参数检索数据存储列表以过滤结果。
 *     parameters:
 *       - in: query
 *         name: key
 *         description: key
 *         x-description-zh: 存储的名称
 *       - in: query
 *         name: dataType
 *         description: DataType
 *         x-description-zh: 数据类型
 *       - in: query
 *         name: scope
 *         description: scope
 *         x-description-zh: 数据作用域
 *     responses:
 *       200:
 *         description: A JSON array of datastores
 */
router.get('/', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const {
    userId = '',
    sessionId = '',
    assistantId = '',
    projectId = '',
    key = '',
    scope = '',
    dataType = '',
  } = await getDatastoreSchema.validateAsync(req.query, { stripUnknown: true });

  const currentUserId = req.user?.did || userId || '';
  if (!currentUserId) {
    throw new Error('Can not get user info');
  }

  const params: { [key: string]: string } = {
    ...(currentUserId && { userId: currentUserId }),
    ...(sessionId && { sessionId }),
    ...(projectId && { projectId }),
    ...(assistantId && { assistantId }),
    ...(scope && { scope }),
    ...(dataType && { dataType }),
    ...(key && { key }),
  };

  const datastores = await Datastore.findAll({ order: [['createdAt', 'ASC']], where: params });
  res.json(datastores);
});

/**
 * @openapi
 * /api/datastore:
 *   post:
 *     summary: Set a new datastore
 *     description: Set a new datastore
 *     x-summary-zh: 设置数据存储
 *     x-description-zh: 设置数据存储
 *     parameters:
 *       - in: query
 *         name: reset
 *         schema:
 *           type: boolean
 *         required: false
 *         x-parameter-type: boolean
 *         description: Whether to overwrite old data
 *         x-description-zh: 是否覆盖旧数据
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *               - data
 *             properties:
 *               key:
 *                 type: string
 *                 description: key
 *                 x-description-zh: 别名
 *               scope:
 *                 type: string
 *                 description: Scope
 *                 x-description-zh: 数据作用域
 *               dataType:
 *                 type: string
 *                 description: DataType
 *                 x-description-zh: 数据类型
 *               data:
 *                 type: object
 *                 description: value
 *                 x-description-zh: 存储对象数据
 *     responses:
 *       200:
 *         description: The created datastore object
 */
router.post('/', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const { key, data, scope, dataType } = await postDatastoreSchema.validateAsync(req.body, { stripUnknown: true });
  const { userId, sessionId, assistantId, projectId, reset } = await postParamsSchema.validateAsync(req.query, {
    stripUnknown: true,
  });

  const currentUserId = req.user?.did || userId || '';
  if (!currentUserId) {
    throw new Error('Can not get user info');
  }

  if (!key) {
    throw new Error('Can not find `key` or `itemId` params');
  }

  if (reset)
    await Datastore.destroy({ where: { ...(dataType && { dataType }), ...(scope && { scope }), ...(key && { key }) } });

  const datastore = await Datastore.create({
    key,
    scope,
    dataType,
    data,
    userId: currentUserId,
    sessionId,
    assistantId,
    projectId,
  });
  res.json(datastore);
});

/**
 * @openapi
 * /api/datastore:
 *   put:
 *     summary: Update data
 *     description: Update data
 *     x-summary-zh: 更新数据存储
 *     x-description-zh: 更新数据存储的信息。
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: false
 *         description: ID
 *         x-description-zh: ID
 *       - in: query
 *         name: key
 *         description: key
 *         x-description-zh: 存储的名称
 *       - in: query
 *         name: dataType
 *         description: DataType
 *         x-description-zh: 数据类型
 *       - in: query
 *         name: scope
 *         description: scope
 *         x-description-zh: 数据作用域
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: object
 *                 description: value
 *                 x-description-zh: 存储对象数据
 *     responses:
 *       200:
 *         description: The updated datastore object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The unique identifier for the datastore.
 *                 data:
 *                   type: object
 *                   description: The updated data of the datastore.
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: The creation date of the datastore.
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: The last update date of the datastore.
 *       404:
 *         description: No such datastore found
 */
router.put('/', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const {
    userId = '',
    sessionId = '',
    assistantId = '',
    projectId = '',
    dataType = '',
    key = '',
    id = '',
    scope = '',
  } = await putParamsSchema.validateAsync(req.query, { stripUnknown: true });

  const currentUserId = req.user?.did || userId || '';

  if (!currentUserId) {
    throw new Error('Can not get user info');
  }

  const params: { [key: string]: string } = {
    ...(currentUserId && { userId: currentUserId }),
    ...(sessionId && { sessionId }),
    ...(assistantId && { assistantId }),
    ...(projectId && { projectId }),
    ...(key && { key }),
    ...(dataType && { dataType }),
    ...(scope && { scope }),
    ...(id && { id }),
  };

  const { data } = await Joi.object<{ data: any }>({ data: Joi.any() }).validateAsync(req.body, { stripUnknown: true });

  const dataItem = await Datastore.findOne({ where: params });
  if (!dataItem) {
    res.status(404).json({ error: 'No such datastore' });
    return;
  }

  const result = await dataItem.update({ data });
  res.json(result);
});

/**
 * @openapi
 * /api/datastore:
 *   delete:
 *     summary: Delete datastore data
 *     description: Delete datastore data
 *     x-summary-zh: 删除存储数据
 *     x-description-zh: 删除数据存储。
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: false
 *         description: ID
 *         x-description-zh: ID
 *       - in: query
 *         name: key
 *         schema:
 *           type: string
 *         required: false
 *         description: key
 *         x-description-zh: 数据存储项别名
 *       - in: query
 *         name: dataType
 *         description: DataType
 *         x-description-zh: 数据类型
 *       - in: query
 *         name: scope
 *         description: scope
 *         x-description-zh: 数据作用域
 *     responses:
 *       200:
 *         description: The deleted datastore object
 *       404:
 *         description: No such datastore found
 */
router.delete('/', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const {
    userId = '',
    sessionId = '',
    assistantId = '',
    projectId = '',
    dataType = '',
    scope = '',
    key = '',
    id = '',
  } = await putParamsSchema.validateAsync(req.query, { stripUnknown: true });

  const currentUserId = req.user?.did || userId || '';
  if (!currentUserId) {
    throw new Error('Can not get user info');
  }

  const params: { [key: string]: string } = {
    ...(currentUserId && { userId: currentUserId }),
    ...(sessionId && { sessionId }),
    ...(projectId && { projectId }),
    ...(assistantId && { assistantId }),
    ...(key && { key }),
    ...(dataType && { dataType }),
    ...(scope && { scope }),
    ...(id && { id }),
  };

  try {
    await Datastore.destroy({ where: params });

    res.json({ data: 'success' });
  } catch (error) {
    console.error(error?.message);
    res.status(500).json({ error: error?.message });
  }
});

router.get('/variable-by-query', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const query = await getVariableSchema.validateAsync(req.query, { stripUnknown: true });
  const { key, projectId, scope, sessionId, dataType, userId } = query;

  const currentUserId = req.user?.did || userId || '';
  if (!currentUserId) {
    throw new Error('Can not get user info');
  }

  const params: { [key: string]: any } = {
    ...(currentUserId && { userId: currentUserId }),
    ...(projectId && { projectId }),
    ...(dataType && { dataType }),
    ...(key && { key }),
  };

  if (scope === 'session') {
    const datastores = await Datastore.findAll({
      order: [['itemId', 'ASC']],
      where: { ...params, scope, sessionId },
    });
    if (datastores.length) {
      return res.json(datastores);
    }
  }

  if (scope === 'session' || scope === 'user') {
    const datastores = await Datastore.findAll({
      order: [['itemId', 'ASC']],
      where: { ...params, scope: 'user' },
    });
    if (datastores.length) {
      return res.json(datastores);
    }
  }

  if (scope === 'session' || scope === 'user' || scope === 'global') {
    const datastores = await Datastore.findAll({
      order: [['itemId', 'ASC']],
      where: { ...params, scope: 'global' },
    });
    if (datastores.length) {
      return res.json(datastores);
    }
  }

  return res.json([]);
});

export default router;
