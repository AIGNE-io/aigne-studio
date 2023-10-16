import Joi from 'joi';

import { Template } from '../../api/src/store/templates';

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

export const templateSchema = Joi.object<Template>({
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
        .valid(...['system', 'user', 'assistant'])
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
  next: Joi.object({
    id: Joi.string().empty(Joi.valid('', null)),
    name: Joi.string().empty(Joi.valid('', null)),
    outputKey: Joi.string().empty(Joi.valid('', null)),
  }),
  public: Joi.boolean().valid(true, false).default(false),
});

export const importBodySchema = Joi.object<{ templates?: (Template & { path?: string })[] }>({
  templates: Joi.array().items(
    templateSchema.concat(
      Joi.object({
        id: Joi.string().required(),
        createdAt: Joi.string().empty(Joi.valid(null, '')),
        updatedAt: Joi.string().empty(Joi.valid(null, '')),
        createdBy: Joi.string().empty(Joi.valid(null, '')),
        updatedBy: Joi.string().empty(Joi.valid(null, '')),
        path: Joi.string().trim().empty(Joi.valid(null, '')),
      }).rename('_id', 'id', { ignoreUndefined: true })
    )
  ),
});
