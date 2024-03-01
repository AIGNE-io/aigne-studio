import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';

import { checkUserAuth } from '../../libs/user';
import DatasetSegment from '../../store/models/dataset/segment';
import { saveContentToVectorStore } from './embeddings';

const router = Router();
router.get('/:datasetId/:unitId', user(), checkUserAuth(), async (req, res) => {
  const { unitId } = await Joi.object<{ unitId: string }>({
    unitId: Joi.string().required(),
  }).validateAsync(req.params, { stripUnknown: true });

  const { page, size } = await Joi.object<{ page: number; size: number }>({
    page: Joi.number().integer().min(1).default(1),
    size: Joi.number().integer().min(1).max(100).default(20),
  }).validateAsync(req.query, { stripUnknown: true });

  const [items, total] = await Promise.all([
    DatasetSegment.findAll({
      order: [['createdAt', 'ASC']],
      where: { unitId },
      offset: (page - 1) * size,
      limit: size,
    }),
    DatasetSegment.count({ where: { unitId } }),
  ]);

  res.json({ items, total });
});

router.post('/:datasetId/:unitId', user(), checkUserAuth(), async (req, res) => {
  const { datasetId, unitId } = await Joi.object<{ datasetId: string; unitId: string }>({
    datasetId: Joi.string().required(),
    unitId: Joi.string().required(),
  }).validateAsync(req.params, { stripUnknown: true });

  const { content } = await Joi.object<{ content: string }>({
    content: Joi.string().required(),
  }).validateAsync(req.body, { stripUnknown: true });

  await saveContentToVectorStore(content, datasetId, unitId);

  res.json();
});

router.delete('/:segmentId', user(), checkUserAuth(), async (req, res) => {
  const { segmentId } = await Joi.object<{ segmentId: string }>({
    segmentId: Joi.string().required(),
  }).validateAsync(req.params, { stripUnknown: true });

  await DatasetSegment.destroy({ where: { id: segmentId } });

  res.json();
});

export default router;
