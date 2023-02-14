import { middlewares } from '@blocklet/sdk';
import { Router } from 'express';
import Joi from 'joi';

import { ensureAdmin } from '../libs/security';
import { Template, templates } from '../store/templates';

const router = Router();

export interface TemplateInput extends Pick<Template, 'icon' | 'name' | 'description' | 'template' | 'parameters'> {}

const templateSchema = Joi.object<TemplateInput>({
  icon: Joi.string().allow(''),
  name: Joi.string().allow('').required(),
  description: Joi.string().allow(''),
  template: Joi.string().allow('').required(),
  parameters: Joi.object().pattern(
    Joi.string().required(),
    Joi.object({
      type: Joi.string().valid('number', 'string'),
    }).pattern(Joi.string(), Joi.any())
  ),
});

router.get('/', ensureAdmin, async (_, res) => {
  const list = await templates.paginate({ sort: { updatedAt: -1 } });
  res.json({ templates: list });
});

router.get('/:templateId', ensureAdmin, async (req, res) => {
  const { templateId } = req.params;

  const template = await templates.findOne({ _id: templateId });
  if (!template) {
    res.status(404).json({ error: 'No such template' });
    return;
  }

  res.json(template);
});

router.post('/', middlewares.user(), ensureAdmin, async (req, res) => {
  const template = await templateSchema.validateAsync(req.body, { stripUnknown: true });
  const doc = await templates.insert({
    ...template,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: req.user!.did,
    updatedBy: req.user!.did,
  });
  res.json(doc);
});

router.put('/:templateId', middlewares.user(), ensureAdmin, async (req, res) => {
  const { templateId } = req.params;

  const template = await templates.findOne({ _id: templateId });
  if (!template) {
    res.status(404).json({ error: 'No such template' });
    return;
  }

  const update = await templateSchema.validateAsync(req.body, { stripUnknown: true });
  const [, doc] = await templates.update(
    { _id: templateId },
    {
      $set: {
        ...update,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user!.did,
      },
    },
    { returnUpdatedDocs: true }
  );
  res.json(doc);
});

router.delete('/:templateId', ensureAdmin, async (req, res) => {
  const { templateId } = req.params;

  const template = await templates.findOne({ _id: templateId });
  if (!template) {
    res.status(404).json({ error: 'No such template' });
    return;
  }

  await templates.remove({ _id: templateId });
  res.json(template);
});

export default router;
