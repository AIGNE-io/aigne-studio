import Joi from 'joi';

const customJoi = Joi.extend((joi) => ({
  type: 'string',
  base: joi.string(),
  messages: {
    'string.customId': '{{#label}} does not match the expected format (type:path:method)',
  },
  rules: {
    customId: {
      validate(value, helpers) {
        const [, path, method] = value.split(':');
        const parts = helpers.state.ancestors[0];

        if (!path || !method) {
          return helpers.error('string.customId');
        }

        if (path !== parts.path || method !== parts.method) {
          return helpers.error('string.customId');
        }

        return value;
      },
    },
  },
}));

const baseParameterObjectSchema = Joi.object({
  description: Joi.string().optional(),
  required: Joi.boolean().optional(),
  deprecated: Joi.boolean().optional(),
  allowEmptyValue: Joi.boolean().optional(),
  style: Joi.string()
    .valid('matrix', 'label', 'form', 'simple', 'spaceDelimited', 'pipeDelimited', 'deepObject')
    .insensitive()
    .optional(),
  explode: Joi.boolean().optional(),
  allowReserved: Joi.boolean().optional(),
  schema: Joi.any().optional(),
  examples: Joi.object().pattern(Joi.string(), Joi.any).optional(),
  example: Joi.any().optional(),
  content: Joi.any().optional(),
}).optional();

const parameterObjectSchema = baseParameterObjectSchema.keys({
  name: Joi.string().required(),
  in: Joi.string().valid('query', 'header', 'path', 'cookie').insensitive().required(),
});

export default Joi.object({
  id: customJoi.string().customId().required(),
  type: Joi.string().required(),
  url: Joi.string().uri().optional(),
  path: Joi.string().required(),
  method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH').insensitive().required(),
  summary: Joi.string().optional(),
  description: Joi.string().optional(),
  parameters: Joi.array().items(parameterObjectSchema).optional(),
}).unknown(true);
