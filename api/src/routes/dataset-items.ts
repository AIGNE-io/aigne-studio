import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';

import { ensureAdmin } from '../libs/security';
import { DatasetItem, datasetItems } from '../store/dataset-items';

const router = Router();

router.get('/:datasetId/items', ensureAdmin, async (req, res) => {
  const { datasetId } = req.params;
  const [items, total] = await Promise.all([
    datasetItems.cursor({ datasetId }).sort({ createdAt: 1 }).exec(),
    datasetItems.count({ datasetId }),
  ]);

  res.json({
    items,
    total,
  });
});

export interface CreateItem {
  name?: string;
  data?: DatasetItem['data'];
}

export type CreateItemInput = CreateItem | CreateItem[];

const createItemSchema = Joi.object<CreateItem>({
  name: Joi.string().empty(Joi.valid(null, '')),
  data: Joi.object({
    type: Joi.string().valid('discussion').required(),
  }).when(Joi.object({ type: 'discussion' }).unknown(), {
    then: Joi.object({
      id: Joi.string().required(),
    }),
  }),
});

const createItemInputSchema = Joi.alternatives<CreateItemInput>().try(
  Joi.array().items(createItemSchema),
  createItemSchema
);

router.post('/:datasetId/items', user(), ensureAdmin, async (req, res) => {
  const { datasetId } = req.params;
  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  const input = await createItemInputSchema.validateAsync(req.body, { stripUnknown: true });
  const { did } = req.user!;

  const arr = Array.isArray(input) ? input : [input];

  const doc = await datasetItems.insert(
    arr.map((item) => ({
      datasetId,
      name: item.name,
      data: item.data,
      createdBy: did,
      updatedBy: did,
    }))
  );
  res.json(Array.isArray(input) ? doc : doc[0]);
});

router.delete('/:datasetId/items/:itemId', user(), ensureAdmin, async (req, res) => {
  const { datasetId, itemId } = req.params;
  if (!datasetId || !itemId) {
    throw new Error('Missing required params `datasetId` or `itemId`');
  }

  await datasetItems.remove({ _id: itemId, datasetId });
  res.json({});
});

export default router;
