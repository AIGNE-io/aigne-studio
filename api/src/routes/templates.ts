import { user } from '@blocklet/sdk/lib/middlewares';
import { Request, Response, Router } from 'express';
import Joi from 'joi';
import { omit } from 'lodash';
import { nanoid } from 'nanoid';

import { ensureAdmin } from '../libs/security';
import { tags } from '../store/tags';
import { Template, roles, templates } from '../store/templates';

const router = Router();

export interface TemplateInput
  extends Pick<
    Template,
    'mode' | 'type' | 'icon' | 'name' | 'tags' | 'description' | 'prompts' | 'parameters' | 'branch'
  > {}

const valueSchema = Joi.alternatives().conditional('type', {
  switch: [
    { is: 'number', then: Joi.number() },
    {
      is: 'horoscope',
      then: Joi.object({
        time: Joi.string().required(),
        offset: Joi.number().integer(),
        location: Joi.object({
          id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
          latitude: Joi.number().required(),
          longitude: Joi.number().required(),
          name: Joi.string().required(),
        }).required(),
      }),
      otherwise: Joi.string().empty(''),
    },
  ],
});

const parametersSchema = Joi.object().pattern(
  Joi.string().required(),
  Joi.object({
    type: Joi.string().valid('string', 'number', 'select', 'language', 'horoscope').default('string'),
    value: valueSchema,
    defaultValue: valueSchema,
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
);

const templateSchema = Joi.object<TemplateInput>({
  mode: Joi.string().valid('default', 'chat').empty(''),
  type: Joi.string().valid('branch').empty(''),
  icon: Joi.string().allow(''),
  name: Joi.string().allow('').required(),
  tags: Joi.array().items(Joi.string()).unique(),
  description: Joi.string().allow(''),
  prompts: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      content: Joi.string().empty(''),
      role: Joi.string()
        .valid(...roles)
        .empty(''),
    })
  ),
  parameters: parametersSchema,
  branch: Joi.object({
    branches: Joi.array().items(
      Joi.object({
        template: Joi.object({
          id: Joi.string().empty(''),
          name: Joi.string().required(),
        }),
        description: Joi.string().allow(''),
      })
    ),
  }),
});

const paginationSchema = Joi.object<{ offset: number; limit: number; sort?: string; search?: string; tag?: string }>({
  offset: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().empty(''),
  search: Joi.string().empty(''),
  tag: Joi.string().empty(''),
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
  const { offset, limit, tag, ...query } = await paginationSchema.validateAsync(req.query);
  const sort = getTemplateSort(query.sort) ?? { updatedAt: -1 };

  const filter = [];

  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    filter.push({ name: { $regex: regex } }, { description: { $regex: regex } });
  }
  if (tag) {
    filter.push({ tags: { $in: [tag] } });
  }

  const list = await templates
    .cursor(filter.length ? { $or: filter } : undefined)
    .sort(sort)
    .skip(offset)
    .limit(limit)
    .exec();

  res.json({ templates: list.map((template) => migrateTemplateToPrompts(template as any)) });
}

router.get('/', ensureAdmin, getTemplates);

export async function getTemplate(req: Request, res: Response) {
  const { templateId } = req.params;

  const template = await templates.findOne({ _id: templateId });
  if (!template) {
    res.status(404).json({ error: 'No such template' });
    return;
  }

  res.json(migrateTemplateToPrompts(template as any));
}

function migrateTemplateToPrompts(template: Template): Template {
  const prompt: string | undefined = (template as any).template;
  if (template.prompts || !prompt) {
    return omit(template, 'template');
  }
  return { ...omit(template), prompts: [{ id: nanoid(), role: 'system', content: prompt }] };
}

router.get('/:templateId', ensureAdmin, getTemplate);

async function createBranches(branch: Template['branch'], did: string): Promise<Template['branch']> {
  if (!branch) {
    return branch;
  }
  return {
    ...branch,
    branches: await Promise.all(
      branch.branches.map(async (i) => {
        if (!i.template || i.template.id) return i;
        const template = await templates.insert({
          name: i.template.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: did,
          updatedBy: did,
        });
        return { ...i, template: { id: template._id!, name: i.template.name } };
      })
    ),
  };
}

router.post('/', user(), ensureAdmin, async (req, res) => {
  const template = await templateSchema.validateAsync(req.body, { stripUnknown: true });
  const { did } = req.user!;

  if (template.tags) {
    await tags.createIfNotExists({ tags: template.tags, did });
  }

  const doc = await templates.insert({
    ...template,
    branch: template.branch && (await createBranches(template.branch, did)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: did,
    updatedBy: did,
  });
  res.json(doc);
});

router.put('/:templateId', user(), ensureAdmin, async (req, res) => {
  const { templateId } = req.params;

  const template = await templates.findOne({ _id: templateId });
  if (!template) {
    res.status(404).json({ error: 'No such template' });
    return;
  }

  const update = await templateSchema.validateAsync(req.body, { stripUnknown: true });

  const { did } = req.user!;

  if (update.tags) {
    await tags.createIfNotExists({ tags: update.tags, did });
  }

  const [, doc] = await templates.update(
    { _id: templateId },
    {
      $set: {
        ...update,
        branch: update.branch && (await createBranches(update.branch, did)),
        updatedAt: new Date().toISOString(),
        updatedBy: did,
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
