import { user } from '@blocklet/sdk/lib/middlewares';
import { Request, Response, Router } from 'express';
import Joi from 'joi';
import { omit } from 'lodash';
import { nanoid } from 'nanoid';

import { ensureAdmin } from '../libs/security';
import timeMachine from '../libs/time-machine';
import { getUsers } from '../libs/user';
import { tags } from '../store/tags';
import { Template, nextTemplateId, roles, templates } from '../store/templates';

const router = Router();

export interface TemplateInput
  extends Pick<
    Template,
    | 'mode'
    | 'type'
    | 'icon'
    | 'name'
    | 'tags'
    | 'description'
    | 'prompts'
    | 'parameters'
    | 'branch'
    | 'model'
    | 'temperature'
    | 'folderId'
    | 'datasets'
    | 'next'
    | 'versionNote'
  > {
  deleteEmptyTemplates?: string[];
}

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

export const templateSchema = Joi.object<TemplateInput>({
  mode: Joi.string().valid('default', 'chat').empty(''),
  type: Joi.string().valid('branch', 'image').empty(''),
  icon: Joi.string().empty(''),
  name: Joi.string().empty(''),
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
        id: Joi.string().required(),
        template: Joi.object({
          id: Joi.string().empty(''),
          name: Joi.string().required(),
        }),
        description: Joi.string().allow(''),
      })
    ),
  }),
  model: Joi.string().empty(null),
  temperature: Joi.number().min(0).max(2).empty(null),
  deleteEmptyTemplates: Joi.array().items(Joi.string()),
  folderId: Joi.string().allow(null),
  datasets: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      type: Joi.string().valid('vectorStore').required(),
    }).when(Joi.object({ type: 'vectorStore' }).unknown(), {
      then: Joi.object({
        vectorStore: Joi.object({
          id: Joi.string().required(),
          name: Joi.string().empty(Joi.valid(null, '')),
        }),
      }),
    })
  ),
  next: Joi.object({
    id: Joi.string().empty(Joi.valid('', null)),
    name: Joi.string().empty(Joi.valid('', null)),
    outputKey: Joi.string().empty(Joi.valid('', null)),
  }),
  versionNote: Joi.string().allow(''),
});

const paginationSchema = Joi.object<{
  offset: number;
  limit: number;
  sort?: string;
  search?: string;
  tag?: string;
  type?: 'image';
}>({
  offset: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().empty(''),
  search: Joi.string().empty(''),
  tag: Joi.string().empty(''),
  type: Joi.string().valid('image').empty(''),
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
  const { offset, limit, tag, type, ...query } = await paginationSchema.validateAsync(req.query, {
    stripUnknown: true,
  });
  const sort = getTemplateSort(query.sort) ?? { updatedAt: -1 };

  const filter = [];

  if (type) {
    filter.push({ type });
  }
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
  if (!templateId) throw new Error('Missing required params `templateId`');

  const template = await templates.findOne({ _id: templateId });
  if (!template) {
    res.status(404).json({ error: 'No such template' });
    return;
  }

  res.json(migrateTemplateToPrompts(template as any));
}

function migrateTemplateToPrompts(template: Template): Template {
  let res = template;

  const prompt: string | undefined = (template as any).template;
  if (template.prompts || !prompt) {
    res = omit(template, 'template');
  } else {
    res = { ...omit(template), prompts: [{ id: nanoid(), role: 'system', content: prompt }] };
  }

  if (res.branch?.branches) {
    for (const i of res.branch.branches) {
      if (!i.id) {
        i.id = nanoid();
      }
    }
  }

  return res;
}

router.get('/:templateId', ensureAdmin, getTemplate);

const checkoutTemplateQuerySchema = Joi.object<{ hash: string }>({
  hash: Joi.string().required(),
});

router.post('/:templateId/checkout', ensureAdmin, async (req, res) => {
  const { templateId } = req.params;
  if (!templateId) throw new Error('Missing required params `templateId`');
  const { hash } = await checkoutTemplateQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const template = await timeMachine.getTemplate(hash, templateId);
  const [, doc] = (await templates.update(
    { _id: template._id },
    { $set: { ...template, hash } },

    { returnUpdatedDocs: true }
  )) as any as [number, Template];

  res.json(doc);
});

router.get('/:templateId/commits', ensureAdmin, async (req, res) => {
  const { templateId } = req.params;
  if (!templateId) throw new Error('Missing required params `templateId`');

  const commits = (await timeMachine.getTemplateCommits(templateId)).map((i) => ({
    ...i,
    commit: {
      ...i.commit,
      message: i.commit.message.replace(/\n$/, ''),
    },
  }));

  const dids = [...new Set(commits.map((i) => i.commit.author.email))];
  const users = await getUsers(dids);

  commits.forEach((i) => {
    const user = users[i.commit.author.email];
    if (user) Object.assign(i.commit.author, user);
  });

  res.json({ commits });
});

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
  const input = await templateSchema.validateAsync(req.body, { stripUnknown: true });
  const { did } = req.user!;

  if (input.tags) {
    await tags.createIfNotExists({ tags: input.tags, did });
  }

  const template: Template = {
    ...input,
    _id: nextTemplateId(),
    branch: input.branch && (await createBranches(input.branch, did)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: did,
    updatedBy: did,
  };

  const hash = await timeMachine.writeTemplate(template);

  const doc = (await templates.insert({ ...template, hash })) as Template;

  res.json(doc);
});

router.put('/:templateId', user(), ensureAdmin, async (req, res) => {
  const { templateId } = req.params;

  const template: Template = (await templates.findOne({ _id: templateId })) as Template;
  if (!template) {
    res.status(404).json({ error: 'No such template' });
    return;
  }

  const { deleteEmptyTemplates, ...input } = await templateSchema.validateAsync(req.body, { stripUnknown: true });

  const { did } = req.user!;

  if (input.tags) {
    await tags.createIfNotExists({ tags: input.tags, did });
  }

  const update = {
    ...input,
    branch: input.branch && (await createBranches(input.branch, did)),
    updatedAt: new Date().toISOString(),
    updatedBy: did,
  };

  const hash = await timeMachine.writeTemplate({
    ...template,
    ...update,
  });

  const [, doc] = (await templates.update(
    { _id: templateId },
    {
      $set: {
        ...update,
        hash,
      },
    },
    { returnUpdatedDocs: true }
  )) as any as [number, Template];

  if (deleteEmptyTemplates?.length) {
    const ts: Template[] = (await templates.find({ _id: { $in: deleteEmptyTemplates } })) as any;
    const ids = ts.filter(isTemplateEmpty).map((i) => i._id);
    if (ids.length) {
      await templates.remove({ _id: { $in: ids } }, { multi: true });
    }
  }

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

function isTemplateEmpty(template: Template) {
  if (template.branch?.branches.some((i) => !!i.template)) {
    return false;
  }
  if (template.prompts?.some((i) => i.content?.trim())) {
    return false;
  }
  return true;
}
