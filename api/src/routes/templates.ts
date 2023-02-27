import { middlewares } from '@blocklet/sdk';
import { Request, Response, Router } from 'express';
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
      type: Joi.string().valid('string', 'number', 'select', 'language').default('string'),
      value: Joi.alternatives().conditional('type', {
        is: 'number',
        then: Joi.number(),
        otherwise: Joi.string().allow(''),
      }),
      required: Joi.boolean(),
      label: Joi.string().allow(''),
      placeholder: Joi.string().allow(''),
      helper: Joi.string().allow(''),
    })
      .when(Joi.object({ type: 'string' }).unknown(), {
        then: Joi.object({
          multiline: Joi.boolean(),
          minLength: Joi.number().integer().min(1),
          maxLength: Joi.number().integer().min(1),
        }),
      })
      .when(Joi.object({ type: 'number' }).unknown(), {
        then: Joi.object({
          min: Joi.number(),
          max: Joi.number(),
        }),
      })
      .when(Joi.object({ type: 'select' }).unknown(), {
        then: Joi.object({
          options: Joi.array().items(
            Joi.object({
              id: Joi.string().required(),
              label: Joi.string().required().allow(''),
              value: Joi.string().required().allow(''),
            })
          ),
        }),
      })
  ),
});

const paginationSchema = Joi.object<{ offset: number; limit: number; sort?: string; search?: string }>({
  offset: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().empty(''),
  search: Joi.string().empty(''),
});

const templateSortableFields: (keyof Template)[] = ['name', 'createdAt', 'updatedAt'];

const getTemplateSort = (sort: any) => {
  if (typeof sort !== 'string') {
    return null;
  }
  const field = sort.replace(/^[+-]?/, '');
  if (!templateSortableFields.includes(field as any)) {
    return null;
  }
  return { [field]: sort[0] === '-' ? -1 : 1 };
};

export async function getTemplates(req: Request, res: Response) {
  const { offset, limit, ...query } = await paginationSchema.validateAsync(req.query);
  const sort = getTemplateSort(query.sort) ?? { updatedAt: -1 };
  const regex = query.search ? new RegExp(query.search, 'i') : undefined;
  const filter = regex ? { $or: [{ name: { $regex: regex } }, { description: { $regex: regex } }] } : undefined;

  const list = await templates.cursor(filter).sort(sort).skip(offset).limit(limit).exec();

  res.json({ templates: list });
}

router.get('/', ensureAdmin, getTemplates);

export async function getTemplate(req: Request, res: Response) {
  const { templateId } = req.params;

  const template = await templates.findOne({ _id: templateId });
  if (!template) {
    res.status(404).json({ error: 'No such template' });
    return;
  }

  res.json(template);
}

router.get('/:templateId', ensureAdmin, getTemplate);

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
