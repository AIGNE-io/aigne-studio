import { getResourceKnowledgeList, getResourceKnowledgeWithData } from '@api/libs/resource';
import DatasetContent from '@api/store/models/dataset/content';
import user from '@blocklet/sdk/lib/middlewares/user';
import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';
import { Op, Sequelize } from 'sequelize';

import { ensureComponentCallOr, ensureComponentCallOrAdmin, userAuth } from '../../libs/security';
import Dataset from '../../store/models/dataset/dataset';
import DatasetDocument from '../../store/models/dataset/document';
import { sse } from './embeddings';

const router = Router();

const datasetSchema = Joi.object<{ name?: string; description?: string; appId?: string }>({
  name: Joi.string().allow('').empty(null).default(''),
  description: Joi.string().allow('').empty(null).default(''),
  appId: Joi.string().allow('').empty(null).default(''),
});

const getDatasetsQuerySchema = Joi.object<{ excludeResource?: boolean }>({
  excludeResource: Joi.boolean().empty(['', null]),
});

router.get('/', user(), ensureComponentCallOr(userAuth()), async (req, res) => {
  const user =
    !req.user || req.user.isAdmin ? {} : { [Op.or]: [{ createdBy: req.user.did }, { updatedBy: req.user.did }] };

  const query = await getDatasetsQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const sql = Sequelize.literal(
    '(SELECT COUNT(*) FROM DatasetDocuments WHERE DatasetDocuments.datasetId = Dataset.id)'
  );

  const datasets = await Dataset.findAll({
    where: { ...user },
    attributes: { include: [[sql, 'documents']] },
  });

  const resourceDatasets = query.excludeResource ? [] : await getResourceKnowledgeList();

  res.json([
    ...datasets,
    ...resourceDatasets.map((i) => ({
      ...i.knowledge,
      blockletDid: i.blockletDid,
      documents: (i.documents || []).length,
    })),
  ]);
});

router.get('/:datasetId', user(), ensureComponentCallOr(userAuth()), async (req, res) => {
  const { datasetId } = req.params;
  if (!datasetId) throw new Error('missing required param `datasetId`');

  const user =
    !req.user || req.user.isAdmin ? {} : { [Op.or]: [{ createdBy: req.user.did }, { updatedBy: req.user.did }] };

  const { blockletDid, appId } = await Joi.object<{ blockletDid?: string; appId?: string }>({
    blockletDid: Joi.string().empty(['', null]),
    appId: Joi.string().allow('').empty(null).default(''),
  }).validateAsync(req.query, { stripUnknown: true });

  const dataset = blockletDid
    ? (await getResourceKnowledgeWithData({ blockletDid, knowledgeId: datasetId }))?.knowledge
    : await Dataset.findOne({ where: { id: datasetId, ...(appId && { appId }), ...user } });

  res.json(dataset);
});

router.get('/:datasetId/export-resource', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const { datasetId } = req.params;
  const documents = await DatasetDocument.findAll({ where: { datasetId, type: { [Op.ne]: 'discussKit' } } });
  const documentIds = documents.map((i) => i.id);
  const contents = await DatasetContent.findAll({ where: { documentId: { [Op.in]: documentIds } } });

  res.json({ documents, contents });
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
