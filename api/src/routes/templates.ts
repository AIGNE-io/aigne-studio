import { join } from 'path';

import { Router } from 'express';
import Joi from 'joi';
import { stringify } from 'yaml';

import { ensureComponentCallOrAdmin } from '../libs/security';
import { Transaction } from '../store/repository';
import { Template, defaultRepository, getTemplate, nextTemplateId, roles } from '../store/templates';

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

const getTemplatesSchema = Joi.object<{
  tag?: string;
  type?: 'image';
}>({
  tag: Joi.string().empty(''),
  type: Joi.string().valid('image').empty(''),
});

router.get('/', ensureComponentCallOrAdmin(), async (req, res) => {
  const { tag, type } = await getTemplatesSchema.validateAsync(req.query, { stripUnknown: true });

  let templates = await Promise.all(
    (await defaultRepository.getFiles())
      .filter((i): i is typeof i & { type: 'file' } => i.type === 'file')
      .map((i) => getTemplate({ path: join(...i.parent, i.name) }))
  );

  if (tag) {
    templates = templates.filter((i) => i.tags?.includes(tag));
  }
  if (type) {
    templates = templates.filter((i) => i.type === type);
  }

  res.json({ templates });
});

const getTemplateQuerySchema = Joi.object<{ hash?: string }>({
  hash: Joi.string().empty(''),
});

router.get('/:templateId', ensureComponentCallOrAdmin(), async (req, res) => {
  const { templateId } = req.params;
  if (!templateId) throw new Error('Missing required params `templateId`');

  const { hash } = await getTemplateQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const template = await getTemplate({ ref: hash, templateId });

  res.json(template);
});

export default router;

export async function createBranches(
  tx: Transaction,
  project: string,
  branch: Template['branch'],
  did: string
): Promise<Template['branch']> {
  if (!branch) {
    return branch;
  }
  return {
    ...branch,
    branches: await Promise.all(
      branch.branches.map(async (i) => {
        if (!i.template || i.template.id) return i;

        const id = nextTemplateId();

        const template: Template = {
          id,
          name: i.template.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: did,
          updatedBy: did,
        };

        await tx.write({ path: project, data: stringify(template) });

        return { ...i, template: { id, name: template.name } };
      })
    ),
  };
}
