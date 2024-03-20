import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';
import { Op, Sequelize } from 'sequelize';

import { userAuth } from '../../libs/user';
import NewDataset from '../../store/models/dataset/dataset';
import NewDatasetItem from '../../store/models/dataset/document';

NewDataset.hasMany(NewDatasetItem, { as: 'items', foreignKey: 'datasetId' });
NewDatasetItem.belongsTo(NewDataset, { as: 'dataset', foreignKey: 'datasetId' });

const router = Router();

const datasetSchema = Joi.object<{ name?: string; description?: string; projectId?: string }>({
  name: Joi.string().allow('').empty(null).default(''),
  description: Joi.string().allow('').empty(null).default(''),
  projectId: Joi.string().allow('').empty(null).default(''),
});

/**
 * @openapi
 * /api/datasets:
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
router.get('/', user(), userAuth(), async (req, res) => {
  const { did } = req.user!;

  const where: any = { [Op.or]: [{ createdBy: did }, { updatedBy: did }] };

  const { projectId } = await Joi.object<{ projectId?: string }>({
    projectId: Joi.string().allow('').empty(null).default(''),
  }).validateAsync(req.query, { stripUnknown: true });

  if (projectId) where.projectId = projectId;

  const sql = Sequelize.literal(
    '(SELECT COUNT(*) FROM NewDatasetItems WHERE NewDatasetItems.datasetId = NewDataset.id)'
  );

  const datasets = await NewDataset.findAll({
    where,
    include: [{ model: NewDatasetItem, as: 'items', attributes: [] }],
    attributes: { include: [[sql, 'documents']] },
    group: ['NewDataset.id'],
  });

  res.json(datasets);
});

/**
 * @openapi
 * /api/datasets/{datasetId}:
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
 *          x-input-type: select
 *          x-options-api: /ai-studio/api/datasets
 *          x-option-key: id
 *          x-option-name: name
 *          schema:
 *            type: string
 *            default: ''
 *      responses:
 *        200:
 *          description: Successfully retrieved the dataset details
 *          x-description-zh: 获取当前用户数据集详情
 */
router.get('/:datasetId', user(), userAuth(), async (req, res) => {
  const { datasetId } = req.params;
  const { did } = req.user!;
  const where: { [key: string]: any } = { id: datasetId, [Op.or]: [{ createdBy: did }, { updatedBy: did }] };

  const { projectId } = await Joi.object<{ projectId?: string }>({
    projectId: Joi.string().allow('').empty(null).default(''),
  }).validateAsync(req.query, { stripUnknown: true });

  if (projectId) where.projectId = projectId;

  const dataset = await NewDataset.findOne({ where });

  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  res.json(dataset);
});

/**
 * @openapi
 * /api/datasets:
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
 *                description:
 *                  type: string
 *                projectId:
 *                  type: string
 *      responses:
 *        200:
 *          description: Successfully created a new dataset
 *          x-description-zh: 创建新的数据集
 */
router.post('/', user(), userAuth(), async (req, res) => {
  const { did } = req.user!;
  const { name, description, projectId } = await datasetSchema.validateAsync(req.body, { stripUnknown: true });

  const dataset = await NewDataset.create({ name, description, projectId, createdBy: did, updatedBy: did });
  res.json(dataset);
});

/**
 * @openapi
 * /api/datasets/{datasetId}:
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
 *          x-input-type: select
 *          x-options-api: /ai-studio/api/datasets
 *          x-option-key: id
 *          x-option-name: name
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
 *                description:
 *                  type: string
 *                projectId:
 *                  type: string
 *      responses:
 *        200:
 *          description: Successfully updated the dataset
 *          x-description-zh: 更新数据集
 */
router.put('/:datasetId', user(), userAuth(), async (req, res) => {
  const { datasetId } = req.params;
  const { did } = req.user!;

  const dataset = await NewDataset.findOne({ where: { id: datasetId } });
  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  const { name, description, projectId } = await datasetSchema.validateAsync(req.body, { stripUnknown: true });
  const params: any = {};
  if (name) params.name = name;
  if (description) params.description = description;
  if (projectId) params.projectId = projectId;

  await NewDataset.update({ ...params, updatedBy: did }, { where: { id: datasetId } });

  const doc = await NewDataset.findOne({ where: { id: datasetId } });
  res.json(doc);
});

/**
 * @openapi
 * /api/datasets/{datasetId}:
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
 *          x-input-type: select
 *          x-options-api: /ai-studio/api/datasets
 *          x-option-key: id
 *          x-option-name: name
 *          schema:
 *            type: string
 *            default: ''
 *      responses:
 *        200:
 *          description: Successfully deleted the dataset
 *          x-description-zh: 删除数据集
 */
router.delete('/:datasetId', user(), userAuth(), async (req, res) => {
  const { datasetId } = req.params;

  const dataset = await NewDataset.findOne({ where: { [Op.or]: [{ id: datasetId }, { name: datasetId }] } });
  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  await NewDataset.destroy({ where: { id: datasetId } });

  res.json(dataset);
});

export default router;
