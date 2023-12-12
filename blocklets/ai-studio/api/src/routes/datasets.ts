import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';
import { Op } from 'sequelize';

import { ensureComponentCallOrAdmin, ensureComponentCallOrPromptsEditor } from '../libs/security';
import Dataset from '../store/models/dataset';

const router = Router();

const datasetSchema = Joi.object<{ name?: string }>({
  name: Joi.string().empty(null),
});

router.get('/', ensureComponentCallOrPromptsEditor(), async (_req, res) => {
  const list = await Dataset.findAll({ order: [['createdAt', 'ASC']] });

  res.json({ datasets: list });
});

router.get('/:datasetId', ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { datasetId } = req.params;

  const dataset = await Dataset.findOne({ where: { _id: datasetId } });
  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  res.json(dataset);
});

router.post('/', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { name } = await datasetSchema.validateAsync(req.body, { stripUnknown: true });
  const { did } = req.user!;

  if (name && (await Dataset.findOne({ where: { name } }))) {
    throw new Error(`Duplicated dataset ${name}`);
  }

  const doc = await Dataset.create({
    name,
    createdBy: did,
    updatedBy: did,
  });
  res.json(doc);
});

router.put('/:datasetId', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const { datasetId } = req.params;

  const dataset = await Dataset.findOne({ where: { _id: datasetId } });
  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  const { name } = await datasetSchema.validateAsync(req.body, { stripUnknown: true });

  if (name && (await Dataset.findOne({ where: { name, _id: { [Op.ne]: dataset._id } } }))) {
    throw new Error(`Duplicated dataset ${name}`);
  }

  const { did } = req.user!;

  await Dataset.update({ name, updatedBy: did }, { where: { _id: datasetId } });

  const doc = await Dataset.findOne({ where: { _id: datasetId } });

  res.json(doc);
});

router.delete('/:datasetId', ensureComponentCallOrAdmin(), async (req, res) => {
  const { datasetId } = req.params;

  const dataset = await Dataset.findOne({ where: { [Op.or]: [{ _id: datasetId }, { name: datasetId }] } });
  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  await Dataset.destroy({ where: { _id: datasetId } });

  res.json(dataset);
});

export default router;
