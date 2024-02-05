import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';
import { Op } from 'sequelize';

import { ensureComponentCallOrPromptsEditor } from '../../libs/security';
import { checkUserAuth } from '../../libs/user';
import Dataset from '../../store/models/dataset/list';

const router = Router();

const datasetSchema = Joi.object<{ name?: string }>({
  name: Joi.string().empty(null),
});

/**
 * @openapi
 * /api/dataset/list:
 *    get:
 *      type: 'SEARCH'
 *      summary: Retrieve the current user's datasets
 *      x-summary-zh: 获取当前用户数据集
 *      description: Retrieve the current user's datasets
 *      x-description-zh: 获取当前用户数据集
 *      responses:
 *        200:
 *          description: Successfully retrieved the current user's datasets
 *          x-description-zh: 获取当前用户数据集
 */
router.get('/list', user(), checkUserAuth(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { did } = req.user!;
  const list = await Dataset.findAll({
    order: [['createdAt', 'ASC']],
    where: { [Op.or]: [{ createdBy: did }, { updatedBy: did }] },
  });

  res.json({ datasets: list });
});

/**
 * @openapi
 * /api/dataset/{datasetId}:
 *    get:
 *      type: 'SEARCH'
 *      summary: Retrieve details of a specific dataset
 *      x-summary-zh: 获取当前用户数据集详情
 *      description: Retrieve detailed information of a specific dataset by datasetId
 *      x-description-zh: 通过数据集ID获取某个特定数据集的详细信息
 *      parameters:
 *        - name: datasetId
 *          in: path
 *          description: The ID of the dataset
 *          x-description-zh: 数据集的ID
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *      responses:
 *        200:
 *          description: Successfully retrieved the dataset details
 *          x-description-zh: 获取当前用户数据集详情
 */
router.get('/:datasetId', user(), checkUserAuth(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { datasetId } = req.params;
  const { did } = req.user!;

  const dataset = await Dataset.findOne({
    where: { id: datasetId, [Op.or]: [{ createdBy: did }, { updatedBy: did }] },
  });

  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  res.json(dataset);
});

/**
 * @openapi
 * /api/dataset/create:
 *    post:
 *      type: 'CREATE'
 *      summary: Create a new dataset
 *      x-summary-zh: 创建新的数据集
 *      description: Create a new dataset
 *      x-description-zh: 创建新的数据集
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                name:
 *                  type: string
 *      responses:
 *        200:
 *          description: Successfully created a new dataset
 *          x-description-zh: 创建新的数据集
 */
router.post('/create', user(), checkUserAuth(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { name } = await datasetSchema.validateAsync(req.body, { stripUnknown: true });
  const { did } = req.user!;

  if (name && (await Dataset.findOne({ where: { name } }))) {
    throw new Error(`Duplicated dataset ${name}`);
  }

  const doc = await Dataset.create({ name, createdBy: did, updatedBy: did });
  res.json(doc);
});

/**
 * @openapi
 * /api/dataset/{datasetId}:
 *    put:
 *      type: 'UPDATE'
 *      summary: Update a dataset
 *      x-summary-zh: 更新数据集
 *      description: Update a dataset
 *      x-description-zh: 更新数据集
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
 *                name:
 *                  type: string
 *      responses:
 *        200:
 *          description: Successfully updated the dataset
 *          x-description-zh: 更新数据集
 */
router.put('/:datasetId', user(), checkUserAuth(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { datasetId } = req.params;
  const { did } = req.user!;

  const dataset = await Dataset.findOne({ where: { id: datasetId } });
  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  const { name } = await datasetSchema.validateAsync(req.body, { stripUnknown: true });

  if (name && (await Dataset.findOne({ where: { name, id: { [Op.ne]: dataset.id } } }))) {
    throw new Error(`Duplicated dataset ${name}`);
  }

  await Dataset.update({ name, updatedBy: did }, { where: { id: datasetId } });

  const doc = await Dataset.findOne({ where: { id: datasetId } });

  res.json(doc);
});

/**
 * @openapi
 * /api/dataset/{datasetId}:
 *    delete:
 *      type: 'DELETE'  # Changed from 'SEARCH' to 'DELETE' as it's more appropriate for a delete operation
 *      summary: Delete a dataset
 *      x-summary-zh: 删除数据集
 *      description: Delete a dataset
 *      x-description-zh: 删除数据集
 *      parameters:
 *        - name: datasetId
 *          in: path
 *          description: The ID of the dataset
 *          x-description-zh: 数据集的ID
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *      responses:
 *        200:
 *          description: Successfully deleted the dataset
 *          x-description-zh: 删除数据集
 */
router.delete('/:datasetId', user(), checkUserAuth(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { datasetId } = req.params;

  const dataset = await Dataset.findOne({ where: { [Op.or]: [{ id: datasetId }, { name: datasetId }] } });
  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  await Dataset.destroy({ where: { id: datasetId } });

  res.json(dataset);
});

export default router;
