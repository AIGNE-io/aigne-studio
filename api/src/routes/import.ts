import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';

import { ensureAdmin } from '../libs/security';
import { Folder, folders } from '../store/folders';
import { Template, templates } from '../store/templates';
import { templateSchema } from './templates';

const router = Router();

export const importBodySchema = Joi.object<{
  folders?: Folder[];
  templates?: Template[];
}>({
  folders: Joi.array().items(
    Joi.object({
      _id: Joi.string().required(),
      name: Joi.string().empty(Joi.valid(null, '')),
      createdAt: Joi.string().empty(Joi.valid(null, '')),
      updatedAt: Joi.string().empty(Joi.valid(null, '')),
      createdBy: Joi.string().empty(Joi.valid(null, '')),
      updatedBy: Joi.string().empty(Joi.valid(null, '')),
    })
  ),
  templates: Joi.array().items(
    templateSchema.concat(
      Joi.object({
        _id: Joi.string().required(),
        createdAt: Joi.string().empty(Joi.valid(null, '')),
        updatedAt: Joi.string().empty(Joi.valid(null, '')),
        createdBy: Joi.string().empty(Joi.valid(null, '')),
        updatedBy: Joi.string().empty(Joi.valid(null, '')),
      })
    )
  ),
});

router.post('/', user(), ensureAdmin, async (req, res) => {
  const body = await importBodySchema.validateAsync(req.body, { stripUnknown: true });

  await Promise.all(
    (body.folders ?? []).map(async (folder) => {
      await folders.update({ _id: folder._id }, folder, { upsert: true });
    })
  );

  await Promise.all(
    (body.templates ?? []).map(async (template) => {
      await templates.update({ _id: template._id }, template, { upsert: true });
    })
  );

  res.json({});
});

export default router;
