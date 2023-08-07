import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';

import { ensureComponentCallOrAdmin, ensureComponentCallOrPromptsEditor } from '../libs/security';
import { datasets } from '../store/datasets';

const router = Router();

const datasetSchema = Joi.object<{ name?: string }>({
  name: Joi.string().empty(null),
});

router.get('/', ensureComponentCallOrPromptsEditor(), async (_req, res) => {
  const list = await datasets.cursor().sort({ createdAt: 1 }).exec();

  res.json({
    datasets: list,
  });
});

router.get('/:datasetId', ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { datasetId } = req.params;

  const dataset = await datasets.findOne({ _id: datasetId });
  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  res.json(dataset);
});

router.post('/', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { name } = await datasetSchema.validateAsync(req.body, { stripUnknown: true });
  const { did } = req.user!;

  if (name && (await datasets.findOne({ name }))) {
    throw new Error(`Duplicated dataset ${name}`);
  }

  const doc = await datasets.insert({
    name,
    createdBy: did,
    updatedBy: did,
  });
  res.json(doc);
});

router.put('/:datasetId', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const { datasetId } = req.params;

  const dataset = await datasets.findOne({ _id: datasetId });
  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  const { name } = await datasetSchema.validateAsync(req.body, { stripUnknown: true });

  if (name && (await datasets.findOne({ name, _id: { $ne: dataset._id } }))) {
    throw new Error(`Duplicated dataset ${name}`);
  }

  const { did } = req.user!;

  const [, doc] = await datasets.update(
    { _id: datasetId },
    {
      $set: {
        name,
        updatedBy: did,
      },
    },
    { returnUpdatedDocs: true }
  );

  res.json(doc);
});

router.delete('/:datasetId', ensureComponentCallOrAdmin(), async (req, res) => {
  const { datasetId } = req.params;

  const dataset = await datasets.findOne({ $or: [{ _id: datasetId }, { name: datasetId }] });
  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  await datasets.remove({ _id: datasetId });

  res.json(dataset);
});

export default router;
