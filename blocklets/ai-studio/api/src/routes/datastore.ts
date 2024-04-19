import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';
import { Op } from 'sequelize';

import { ensureComponentCallOrAuth } from '../libs/security';
import Datastore from '../store/models/datastore';

const router = Router();

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
 *         name: type
 *         description: key
 *         x-description-zh: 存储的名称
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
    type = '',
    path = '',
  } = await Joi.object<{
    userId?: string;
    sessionId?: string;
    assistantId?: string;
    projectId?: string;
    path?: string;
    type: string;
    [key: string]: any;
  }>({
    userId: Joi.string()
      .allow('')
      .empty([null, ''])
      .default(req.user?.did || ''),
    assistantId: Joi.string().allow('').empty([null, '']),
    sessionId: Joi.string().allow('').empty([null, '']),
    type: Joi.string().allow('').empty([null, '']),
  })
    .unknown()
    .validateAsync(req.query);

  const currentUserId = req.user?.did || userId || '';

  const params: any = {
    ...(currentUserId && { userId: currentUserId }),
    ...(sessionId && { sessionId }),
    ...(projectId && { projectId }),
    ...(assistantId && { assistantId }),
    ...(path && { path }),
    ...(type && { type }),
  };

  // const conditions = Object.entries(query).map(([key, value]) => ({ [key]: { [Op.like]: `%${value}%` } }));
  // if (conditions?.length) params[Op.and] = conditions;

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
 *               - type
 *               - data
 *             properties:
 *               type:
 *                 type: string
 *                 description: key
 *                 x-description-zh: 别名
 *               path:
 *                 type: string
 *                 description: sub key
 *                 x-description-zh: 子别名(可以为空)
 *               data:
 *                 type: object
 *                 description: value
 *                 x-description-zh: 存储对象数据
 *     responses:
 *       200:
 *         description: The created datastore object
 */
router.post('/', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const { type, path, data } = await Joi.object<{ type: string; path: string; data: any }>({
    type: Joi.string().required(),
    path: Joi.string().allow('').empty([null, '']).optional(),
    data: Joi.any(),
  }).validateAsync(req.body, {
    stripUnknown: true,
  });

  const { userId, sessionId, assistantId, projectId, reset } = await Joi.object<{
    userId?: string;
    sessionId?: string;
    assistantId?: string;
    projectId?: string;
    reset: boolean;
  }>({
    userId: Joi.string()
      .allow('')
      .empty([null, ''])
      .default(req.user?.did || ''),
    sessionId: Joi.string().allow('').empty([null, '']),
    assistantId: Joi.string().allow('').empty([null, '']),
    projectId: Joi.string().allow('').empty([null, '']),
    reset: Joi.boolean().default(false),
  })
    .unknown()
    .validateAsync(req.query);
  const currentUserId = req.user?.did || userId || '';

  const params: any = { ...(path && { path }), ...(type && { type }) };
  if (reset) await Datastore.destroy({ where: params });

  const datastore = await Datastore.create({
    type,
    path,
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
 *         name: type
 *         schema:
 *           type: string
 *         required: false
 *         description: key
 *         x-description-zh: 数据存储项别名
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
    type = '',
    path = '',
    id = '',
  } = await Joi.object<{
    userId?: string;
    sessionId?: string;
    assistantId?: string;
    projectId?: string;
    path?: string;
    type?: string;
    id?: string;
    [key: string]: any;
  }>({
    id: Joi.string().allow('').empty([null, '']).optional(),
    type: Joi.string().allow('').empty([null, '']).optional(),
    userId: Joi.string()
      .allow('')
      .empty([null, ''])
      .default(req.user?.did || ''),
    assistantId: Joi.string().allow('').empty([null, '']),
    sessionId: Joi.string().allow('').empty([null, '']),
  })
    .unknown()
    .validateAsync(req.query);

  const currentUserId = req.user?.did || userId || '';
  const params: any = {
    ...(currentUserId && { userId: currentUserId }),
    ...(sessionId && { sessionId }),
    ...(assistantId && { assistantId }),
    ...(projectId && { projectId }),
    ...(type && { type }),
    ...(path && { path }),
    ...(id && { id }),
  };

  // const conditions = Object.entries(query).map(([key, value]) => ({ [key]: { [Op.like]: `%${value}%` } }));
  // if (conditions?.length) params[Op.and] = conditions;
  const { data } = await Joi.object<{ data: any }>({ data: Joi.any() }).validateAsync(req.body, { stripUnknown: true });

  const datastore = await Datastore.findOne({ where: params });
  if (!datastore) {
    res.status(404).json({ error: 'No such datastore' });
    return;
  }

  await Datastore.update({ data }, { where: params });
  res.json(await Datastore.findOne({ where: params }));
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
 *         name: type
 *         schema:
 *           type: string
 *         required: false
 *         description: key
 *         x-description-zh: 数据存储项别名
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
    projectId = '',
    assistantId = '',
    id = '',
    type = '',
    path = '',
  } = await Joi.object<{
    userId?: string;
    sessionId?: string;
    assistantId?: string;
    projectId?: string;
    id?: string;
    type?: string;
    [key: string]: any;
  }>({
    id: Joi.string().allow('').empty([null, '']).optional(),
    type: Joi.string().allow('').empty([null, '']).optional(),
    userId: Joi.string()
      .allow('')
      .empty([null, ''])
      .default(req.user?.did || ''),
    assistantId: Joi.string().allow('').empty([null, '']),
    sessionId: Joi.string().allow('').empty([null, '']),
  })
    .unknown()
    .validateAsync(req.query);

  const currentUserId = req.user?.did || userId || '';
  const params: any = {
    ...(currentUserId && { userId: currentUserId }),
    ...(sessionId && { sessionId }),
    ...(projectId && { projectId }),
    ...(assistantId && { assistantId }),
    ...(type && { type }),
    ...(path && { path }),
    ...(id && { id }),
  };

  // const conditions = Object.entries(query).map(([key, value]) => ({ [key]: { [Op.like]: `%${value}%` } }));
  // if (conditions?.length) params[Op.and] = conditions;

  const datastores = await Datastore.findAll({ where: params });
  const ids = datastores.map((x) => x.id);
  if (!ids.length) return;

  try {
    await Datastore.destroy({ where: { id: { [Op.in]: ids } } });
    res.json({ data: 'success' });
  } catch (error) {
    console.error(error?.message);
    res.status(500).json({ error: error?.message });
  }
});

export default router;
