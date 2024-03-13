import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';
import { Op } from 'sequelize';

import { checkUserAuth } from '../libs/user';
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
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional filter parameters as JSON string.
 *     responses:
 *       200:
 *         description: A JSON array of datastores
 */
router.get('/', user(), checkUserAuth(), async (req, res) => {
  const querySchema = Joi.object().pattern(Joi.string(), Joi.string());
  const query: { [key: string]: string } = await querySchema.validateAsync(req.query || {});

  const { userId, assistantId, sessionId } = await Joi.object<{
    userId?: string;
    assistantId?: string;
    sessionId?: string;
  }>({
    userId: Joi.string().allow('').empty([null, '']),
    assistantId: Joi.string().allow('').empty([null, '']),
    sessionId: Joi.string().allow('').empty([null, '']),
  }).validateAsync(req.query, { stripUnknown: true });
  const params: any = {};
  if (userId) params.userId = userId;
  if (sessionId) params.sessionId = sessionId;
  if (assistantId) params.assistantId = assistantId;

  const conditions = Object.entries(query).map(([key, value]) => ({ [`data.${key}`]: { [Op.like]: `%${value}%` } }));

  const datastores = await Datastore.findAll({
    order: [['createdAt', 'ASC']],
    where: { ...params, [Op.and]: conditions },
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
router.get('/:id', user(), checkUserAuth(), async (req, res) => {
  const { id } = await Joi.object<{ id: string }>({ id: Joi.string().required() }).validateAsync(req.params, {
    stripUnknown: true,
  });

  const { userId, assistantId, sessionId } = await Joi.object<{
    userId: string;
    assistantId: string;
    sessionId?: string;
  }>({
    userId: Joi.string().required(),
    assistantId: Joi.string().required(),
    sessionId: Joi.string().allow('').empty([null, '']),
  }).validateAsync(req.query, { stripUnknown: true });

  const params: any = { id, userId, assistantId };
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
 *                 type: object
 *                 description: The new data for the datastore.
 *     responses:
 *       200:
 *         description: The created datastore object
 */
router.post('/', user(), checkUserAuth(), async (req, res) => {
  const { data, userId, assistantId, sessionId } = await Joi.object<{
    data: object;
    userId: string;
    assistantId: string;
    sessionId?: string;
  }>({
    data: Joi.object().required().default({}),
    userId: Joi.string().required(),
    assistantId: Joi.string().required(),
    sessionId: Joi.string().allow('').empty([null, '']).default(''),
  }).validateAsync(req.body, { stripUnknown: true });

  const datastore = await Datastore.create({ data, userId, assistantId, sessionId });
  res.json(datastore);
});

/**
 * @openapi
 * /api/datastore/{id}:
 *   put:
 *     summary: Updates a datastore by ID
 *     description: Update the information of a datastore by its ID.
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
router.put('/:id', user(), checkUserAuth(), async (req, res) => {
  const { id } = await Joi.object<{ id: string }>({ id: Joi.string().required() }).validateAsync(req.params, {
    stripUnknown: true,
  });

  const datastore = await Datastore.findOne({ where: { id } });
  if (!datastore) {
    res.status(404).json({ error: 'No such datastore' });
    return;
  }

  const { data } = await Joi.object<{ data: object }>({ data: Joi.object().required().default({}) }).validateAsync(
    req.body,
    { stripUnknown: true }
  );

  await Datastore.update({ data: { ...datastore.dataValues.data, ...data } }, { where: { id } });

  res.json(await Datastore.findOne({ where: { id } }));
});

/**
 * @openapi
 * /api/datastore/{id}:
 *   delete:
 *     summary: Deletes a datastore by ID
 *     description: Remove a datastore from the collection by its ID.
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
router.delete('/:id', user(), checkUserAuth(), async (req, res) => {
  const { id } = await Joi.object<{ id: string }>({ id: Joi.string().required() }).validateAsync(req.params, {
    stripUnknown: true,
  });

  const datastore = await Datastore.findOne({ where: { id } });
  if (!datastore) {
    res.status(404).json({ error: 'No such datastore' });
    return;
  }

  await Datastore.destroy({ where: { id } });

  res.json(datastore);
});

export default router;
