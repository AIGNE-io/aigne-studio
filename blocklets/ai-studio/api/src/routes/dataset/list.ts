import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';
import { Op } from 'sequelize';

import { ensureComponentCallOrPromptsEditor } from '../../libs/security';
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
 *      summary: 获取当前用户数据集
 *      description: 获取当前用户数据集
 *      responses:
 *        200:
 *          description: 获取当前用户数据集
 */
router.get('/list', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { did } = req.user!;

  const list = await Dataset.findAll({ order: [['createdAt', 'ASC']], where: { createdBy: did } });

  res.json({ datasets: list });
});

/**
 * @openapi
 * /api/dataset/{datasetId}:
 *    get:
 *      type: 'SEARCH'
 *      summary: 根据 datasetId 获取当前 datasetId 数据集信息
 *      description: 根据 datasetId 获取当前 datasetId 数据集信息
 *      parameters:
 *        - name: datasetId
 *          in: path
 *          description: 数据集的ID
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *      responses:
 *        200:
 *          description: 根据 datasetId 获取当前 datasetId 数据集信息
 */
router.get('/:datasetId', ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { datasetId } = req.params;

  const dataset = await Dataset.findOne({ where: { id: datasetId } });
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
 *      summary: 保存新的数据集
 *      description: 保存新的数据集
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
 *          description: 保存新的数据集
 */
router.post('/create', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
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
 *      summary: 根据 datasetId 更新当前 datasetId 数据集信息
 *      description: 根据 datasetId 更新当前 datasetId 数据集信息
 *      parameters:
 *        - name: datasetId
 *          in: path
 *          description: 数据集的ID
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
 *          description: 保存新的数据集
 */
router.put('/:datasetId', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
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
 *      type: 'SEARCH'
 *      summary: 删除 datasetId 数据集
 *      description: 删除 datasetId 数据集
 *      parameters:
 *        - name: datasetId
 *          in: path
 *          description: 数据集的ID
 *          required: true
 *          schema:
 *            type: string
 *            default: ''
 *      responses:
 *        200:
 *          description: 删除 datasetId 数据集
 */
router.delete('/:datasetId', ensureComponentCallOrPromptsEditor(), async (req, res) => {
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
