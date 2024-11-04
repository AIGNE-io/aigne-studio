import middlewares from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';

import { userAuth } from '../../libs/security';
import DatasetSegment from '../../store/models/dataset/segment';

const router = Router();

router.get('/:datasetId/documents/:documentId/segments', middlewares.session(), userAuth(), async (req, res) => {
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

export default router;
