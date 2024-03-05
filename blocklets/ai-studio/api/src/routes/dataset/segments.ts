import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';

import { checkUserAuth } from '../../libs/user';
import DatasetSegment from '../../store/models/dataset/segment';
import { resetVectorStoreEmbedding, saveContentToVectorStore } from './embeddings';

const router = Router();

router.get('/:datasetId/:documentId', user(), checkUserAuth(), async (req, res) => {
  const { documentId } = await Joi.object<{ documentId: string }>({
    documentId: Joi.string().required(),
  }).validateAsync(req.params, { stripUnknown: true });

  const { page, size } = await Joi.object<{ page: number; size: number }>({
    page: Joi.number().integer().min(1).default(1),
    size: Joi.number().integer().min(1).max(100).default(20),
  }).validateAsync(req.query, { stripUnknown: true });

  const [items, total] = await Promise.all([
    DatasetSegment.findAll({
      order: [['createdAt', 'ASC']],
      where: { documentId },
      offset: (page - 1) * size,
      limit: size,
    }),
    DatasetSegment.count({ where: { documentId } }),
  ]);

  res.json({ items, total });
});

router.post('/:datasetId/:documentId', user(), checkUserAuth(), async (req, res) => {
  const { datasetId, documentId } = await Joi.object<{ datasetId: string; documentId: string }>({
    datasetId: Joi.string().required(),
    documentId: Joi.string().required(),
  }).validateAsync(req.params, { stripUnknown: true });

  const { content } = await Joi.object<{ content: string }>({
    content: Joi.string().required(),
  }).validateAsync(req.body, { stripUnknown: true });

  await saveContentToVectorStore(content, datasetId, documentId);

  res.json();
});

router.delete('/:datasetId/:segmentId', user(), checkUserAuth(), async (req, res) => {
  const { segmentId, datasetId } = await Joi.object<{ segmentId: string; datasetId: string }>({
    segmentId: Joi.string().required(),
    datasetId: Joi.string().required(),
  }).validateAsync(req.params, { stripUnknown: true });

  await DatasetSegment.destroy({ where: { id: segmentId } });

  resetVectorStoreEmbedding(datasetId);

  res.json();
});

export default router;
