import { getResourceKnowledges } from '@api/libs/resource';
import user from '@blocklet/sdk/lib/middlewares/user';
import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';
import { Op, Sequelize } from 'sequelize';

import { userAuth } from '../../libs/user';
import Dataset from '../../store/models/dataset/dataset';
import DatasetDocument from '../../store/models/dataset/document';
import { sse } from './embeddings';

const router = Router();

const datasetSchema = Joi.object<{ name?: string; description?: string; appId?: string }>({
  name: Joi.string().allow('').empty(null).default(''),
  description: Joi.string().allow('').empty(null).default(''),
  appId: Joi.string().allow('').empty(null).default(''),
});

router.get('/', user(), userAuth(), async (req, res) => {
  const { did, isAdmin } = req.user!;
  const user = isAdmin ? {} : { [Op.or]: [{ createdBy: did }, { updatedBy: did }] };

  const sql = Sequelize.literal(
    '(SELECT COUNT(*) FROM DatasetDocuments WHERE DatasetDocuments.datasetId = Dataset.id)'
  );

  const { filterPrivate } = await Joi.object<{ filterPrivate?: boolean }>({
    filterPrivate: Joi.bool().allow('').empty([null, '']).default(false),
  }).validateAsync(req.query, { stripUnknown: true });

  const datasets = await Dataset.findAll({ where: { ...user }, attributes: { include: [[sql, 'documents']] } });

  const knowledges = await getResourceKnowledges();
  const resource = Object.values(knowledges)
    .map((knowledge) => {
      return { ...knowledge.knowledge, documents: (knowledge?.documents || []).length };
    })
    .filter((knowledge) => {
      if (filterPrivate) return !knowledge.private;
      return knowledge;
    });

  res.json([...resource, ...datasets]);
});

router.get('/:datasetId', user(), userAuth(), async (req, res) => {
  const { datasetId } = req.params;
  const { did, isAdmin } = req.user!;
  const user = isAdmin ? {} : { [Op.or]: [{ createdBy: did }, { updatedBy: did }] };

  const { appId } = await Joi.object<{ appId?: string }>({
    appId: Joi.string().allow('').empty(null).default(''),
  }).validateAsync(req.query, { stripUnknown: true });

  const dataset = await Dataset.findOne({ where: { id: datasetId, ...(appId && { appId }), ...user } });
  const knowledges = await getResourceKnowledges();

  res.json(dataset || knowledges[datasetId || '']?.knowledge);
});

router.post('/', user(), userAuth(), async (req, res) => {
  const { did } = req.user!;
  const { name = '', description = '', appId } = await datasetSchema.validateAsync(req.body, { stripUnknown: true });

  const dataset = await Dataset.create({ name, description, appId, createdBy: did, updatedBy: did });
  res.json(dataset);
});

router.put('/:datasetId', user(), userAuth(), async (req, res) => {
  const { datasetId } = req.params;
  const { did } = req.user!;

  const dataset = await Dataset.findOne({ where: { id: datasetId } });
  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  const { name, description, appId } = await datasetSchema.validateAsync(req.body, { stripUnknown: true });
  const params: any = {};
  if (name) params.name = name;
  if (description) params.description = description;
  if (appId) params.appId = appId;

  await Dataset.update({ ...params, updatedBy: did }, { where: { id: datasetId } });

  res.json(await Dataset.findOne({ where: { id: datasetId } }));
});

router.delete('/:datasetId', user(), userAuth(), async (req, res) => {
  const { datasetId } = req.params;

  const dataset = await Dataset.findOne({ where: { [Op.or]: [{ id: datasetId }, { name: datasetId }] } });
  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  await Promise.all([Dataset.destroy({ where: { id: datasetId } }), DatasetDocument.destroy({ where: { datasetId } })]);

  res.json(dataset);
});

router.get('/:datasetId/embeddings', compression(), sse.init);

export default router;
