import { Router } from 'express';
import Joi from 'joi';
import { Op } from 'sequelize';

import Datasetore from '../store/models/datastore';

// import { sequelize } from '../store/sequelize';

const router = Router();

/**
 * @openapi
 * /api/datastore/list:
 *   get:
 *     summary: Lists all datasetores
 *     description: Retrieve a list of datasetores with optional query parameters to filter the results.
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
 *         description: A JSON array of datasetores
 */
router.get('/list', async (req, res) => {
  const querySchema = Joi.object().pattern(Joi.string(), Joi.string());
  const query: { [key: string]: string } = await querySchema.validateAsync(req.query || {});

  const conditions = Object.entries(query).map(([key, value]) => ({ [`data.${key}`]: { [Op.like]: `%${value}%` } }));

  const datasetores = await Datasetore.findAll({
    order: [['createdAt', 'ASC']],
    where: { [Op.and]: conditions },
  });
  res.json(datasetores);
});

/**
 * @openapi
 * /api/datastore/{id}:
 *   get:
 *     summary: Gets a single datasetore by ID
 *     description: Retrieve detailed information of a specific datasetore by its ID.
 *     x-summary-zh: 通过 ID 获取单个数据存储
 *     x-description-zh: 通过其 ID 检索特定数据存储的详细信息。
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the datasetore to retrieve.
 *     responses:
 *       200:
 *         description: A datasetore object
 *       404:
 *         description: No such datasetore found
 */
router.get('/:id', async (req, res) => {
  const { id } = await Joi.object<{ id: string }>({ id: Joi.string().required() }).validateAsync(req.params, {
    stripUnknown: true,
  });

  const datasetore = await Datasetore.findOne({ where: { id } });
  if (!datasetore) {
    res.status(404).json({ error: 'No such datasetore' });
    return;
  }

  res.json(datasetore);
});

/**
 * @openapi
 * /api/datastore/create:
 *   post:
 *     summary: Creates a new datasetore
 *     description: Add a new datasetore to the collection.
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
 *                 description: The new data for the datasetore.
 *     responses:
 *       200:
 *         description: The created datasetore object
 */
router.post('/create', async (req, res) => {
  const { data } = await Joi.object<{ data: object }>({ data: Joi.object().required().default({}) }).validateAsync(
    req.body,
    { stripUnknown: true }
  );

  const doc = await Datasetore.create({ data });
  res.json(doc);
});

/**
 * @openapi
 * /api/datastore/{id}:
 *   put:
 *     summary: Updates a datasetore by ID
 *     description: Update the information of a datasetore by its ID.
 *     x-summary-zh: 通过 ID 更新数据存储
 *     x-description-zh: 通过其 ID 更新数据存储的信息。
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the datasetore to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 description: The new data for the datasetore.
 *     responses:
 *       200:
 *         description: The updated datasetore object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The unique identifier for the datasetore.
 *                 data:
 *                   type: object
 *                   description: The updated data of the datasetore.
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: The creation date of the datasetore.
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: The last update date of the datasetore.
 *       404:
 *         description: No such datasetore found
 */
router.put('/:id', async (req, res) => {
  const { id } = await Joi.object<{ id: string }>({ id: Joi.string().required() }).validateAsync(req.params, {
    stripUnknown: true,
  });

  const datasetore = await Datasetore.findOne({ where: { id } });
  if (!datasetore) {
    res.status(404).json({ error: 'No such datasetore' });
    return;
  }

  const { data } = await Joi.object<{ data: object }>({ data: Joi.object().required().default({}) }).validateAsync(
    req.body,
    { stripUnknown: true }
  );

  await Datasetore.update({ data: { ...datasetore.dataValues.data, ...data } }, { where: { id } });

  res.json(await Datasetore.findOne({ where: { id } }));
});

/**
 * @openapi
 * /api/datastore/{id}:
 *   delete:
 *     summary: Deletes a datasetore by ID
 *     description: Remove a datasetore from the collection by its ID.
 *     x-summary-zh: 通过 ID 删除数据存储
 *     x-description-zh: 通过其 ID 从集合中删除一个数据存储。
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the datasetore to delete.
 *     responses:
 *       200:
 *         description: The deleted datasetore object
 *       404:
 *         description: No such datasetore found
 */
router.delete('/:id', async (req, res) => {
  const { id } = await Joi.object<{ id: string }>({ id: Joi.string().required() }).validateAsync(req.params, {
    stripUnknown: true,
  });

  const datasetore = await Datasetore.findOne({ where: { id } });
  if (!datasetore) {
    res.status(404).json({ error: 'No such datasetore' });
    return;
  }

  await Datasetore.destroy({ where: { id } });

  res.json(datasetore);
});

export default router;
