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
 *     summary: Lists all datastores
 *     description: Retrieve a list of datastores with optional query parameters to filter the results.
 *     x-summary-zh: 列出所有数据存储
 *     x-description-zh: 使用可选的查询参数检索数据存储列表以过滤结果。
 *     responses:
 *       200:
 *         description: A JSON array of datastores
 */
router.get('/', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const { userId, assistantId, sessionId, ...query } = await Joi.object<{
    userId?: string;
    sessionId?: string;
    assistantId?: string;
    [key: string]: any;
  }>({
    userId: Joi.string()
      .allow('')
      .empty([null, ''])
      .default(req.user?.did || ''),
    assistantId: Joi.string().allow('').empty([null, '']),
    sessionId: Joi.string().allow('').empty([null, '']),
  })
    .unknown()
    .validateAsync(req.query);

  const currentUserId = req.user?.did || userId;

  const params: any = {
    ...(currentUserId && { userId: currentUserId }),
    ...(sessionId && { sessionId }),
  };

  const conditions = Object.entries(query).map(([key, value]) => ({ [`data.${key}`]: { [Op.like]: `%${value}%` } }));
  if (conditions?.length) {
    params[Op.and] = conditions;
  }

  const datastores = await Datastore.findAll({
    order: [['createdAt', 'ASC']],
    where: params,
  });

  res.json(datastores);
});

/**
 * @openapi
 * /api/datastore/{id}:
 *   get:
 *     summary: Gets a single datastore by ID
 *     description: Retrieve detailed information of a specific datastore by its ID.
 *     x-summary-zh: 通过 ID 获取单个数据存储
 *     x-description-zh: 通过其 ID 检索特定数据存储的详细信息。
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the datastore to retrieve.
 *     responses:
 *       200:
 *         description: A datastore object
 *       404:
 *         description: No such datastore found
 */
router.get('/:id', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const { id } = await Joi.object<{ id: string }>({ id: Joi.string().required() }).validateAsync(req.params, {
    stripUnknown: true,
  });

  const { userId, sessionId } = await Joi.object<{
    userId?: string;
    sessionId?: string;
  }>({
    userId: Joi.string()
      .allow('')
      .empty([null, ''])
      .default(req.user?.did || ''),
    sessionId: Joi.string().allow('').empty([null, '']),
  }).validateAsync(req.query, { stripUnknown: true });
  const currentUserId = req.user?.did || userId;

  const params: any = { id, userId: currentUserId };
  if (sessionId) params.sessionId = sessionId;

  const datastore = await Datastore.findOne({ where: params });
  if (!datastore) {
    res.status(404).json({ error: 'No such datastore' });
    return;
  }

  res.json(datastore);
});

/**
 * @openapi
 * /api/datastore:
 *   post:
 *     summary: Creates a new datastore
 *     description: Add a new datastore to the collection.
 *     x-summary-zh: 创建一个新的数据存储
 *     x-description-zh: 向集合中添加一个新的数据存储。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: string
 *                 description: The new data for the datastore.
 *             required:
 *               - data
 *     responses:
 *       200:
 *         description: The created datastore object
 */
router.post('/', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const { data } = await Joi.object<{ data: string }>({ data: Joi.string().required() }).validateAsync(req.body, {
    stripUnknown: true,
  });

  let info = { data };
  try {
    info = JSON.parse(data);
  } catch (error) {
    info = { data };
  }

  const { userId, sessionId } = await Joi.object<{
    userId?: string;
    sessionId?: string;
  }>({
    userId: Joi.string()
      .allow('')
      .empty([null, ''])
      .default(req.user?.did || ''),
    sessionId: Joi.string().allow('').empty([null, '']),
  }).validateAsync(req.query, { stripUnknown: true });
  const currentUserId = req.user?.did || userId || '';

  const datastore = await Datastore.create({ data: info, userId: currentUserId, sessionId });
  res.json(datastore);
});

/**
 * @openapi
 * /api/datastore/{id}:
 *   put:
 *     summary: update data by id
 *     description: update data by id
 *     x-summary-zh: 通过 ID 更新数据存储
 *     x-description-zh: 通过其 ID 更新数据存储的信息。
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the datastore to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 description: The new data for the datastore.
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
router.put('/:id', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const { id } = await Joi.object<{ id: string }>({ id: Joi.string().required() }).validateAsync(req.params, {
    stripUnknown: true,
  });

  const datastore = await Datastore.findOne({ where: { id } });
  if (!datastore) {
    res.status(404).json({ error: 'No such datastore' });
    return;
  }

  const { data } = await Joi.object<{ data: string }>({ data: Joi.string().required() }).validateAsync(req.body, {
    stripUnknown: true,
  });

  let info = { data };
  try {
    info = JSON.parse(data);
  } catch (error) {
    info = { data };
  }

  await Datastore.update({ data: { ...datastore.dataValues.data, ...info } }, { where: { id } });

  res.json(await Datastore.findOne({ where: { id } }));
});

/**
 * @openapi
 * /api/datastore/{id}:
 *   delete:
 *     summary: delete data
 *     description: delete data by id
 *     x-summary-zh: 通过 ID 删除数据存储
 *     x-description-zh: 通过其 ID 从集合中删除一个数据存储。
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the datastore to delete.
 *     responses:
 *       200:
 *         description: The deleted datastore object
 *       404:
 *         description: No such datastore found
 */
router.delete('/:id', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const { id } = await Joi.object<{ id: string }>({ id: Joi.string().required() }).validateAsync(req.params, {
    stripUnknown: true,
  });

  try {
    const datastore = await Datastore.findOne({ where: { id } });
    if (!datastore) {
      throw new Error('No such datastore');
    }

    await Datastore.destroy({ where: { id } });

    res.json({ data: 'success' });
  } catch (error) {
    console.error(error?.message);
    res.status(500).json({ error: error?.message });
  }
});

export default router;
