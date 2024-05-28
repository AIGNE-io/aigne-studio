import * as Joi from 'joi';

import { JSONSchema, RemoteComponent } from './type';

// 应该找一个合适 Schema To Joi 的包
function checkJsonSchema(schema?: JSONSchema): Joi.Schema {
  let joiSchema: Joi.Schema = Joi.any();

  switch (schema?.type) {
    case 'string':
      joiSchema = Joi.object({
        name: Joi.string().optional().allow('').empty(''),
        description: Joi.string().optional().allow('').empty(''),
        required: Joi.boolean().optional(),
        type: Joi.string().valid('string').required(),
      });
      break;
    case 'number':
      joiSchema = Joi.object({
        name: Joi.string().optional().allow('').empty(''),
        description: Joi.string().optional().allow('').empty(''),
        required: Joi.boolean().optional(),
        type: Joi.string().valid('number').required(),
      });

      break;
    case 'boolean':
      joiSchema = Joi.object({
        name: Joi.string().optional().allow('').empty(''),
        description: Joi.string().optional().allow('').empty(''),
        required: Joi.boolean().optional(),
        type: Joi.string().valid('boolean').required(),
      });

      break;
    case 'object':
      if (schema.properties) {
        const properties: { [key: string]: Joi.Schema } = {};
        // eslint-disable-next-line no-restricted-syntax, guard-for-in
        for (const key in schema.properties) {
          properties[key] = checkJsonSchema(schema.properties[key]);
        }

        joiSchema = Joi.object({
          name: Joi.string().optional().allow('').empty(''),
          description: Joi.string().optional().allow('').empty(''),
          required: Joi.boolean().optional(),
          type: Joi.string().valid('object').required(),
          properties,
        });
      }
      break;
    case 'array':
      if (schema.items) {
        joiSchema = Joi.object({
          name: Joi.string().optional().allow('').empty(''),
          description: Joi.string().optional().allow('').empty(''),
          required: Joi.boolean().optional(),
          type: Joi.string().valid('array').required(),
          items: checkJsonSchema(schema.items),
        });
      }
      break;
    default:
      console.error('Not found Type');
      // Handle other types if necessary
      break;
  }

  if (schema?.required) {
    joiSchema = joiSchema.required();
  }

  return joiSchema;
}

const schema = (data: RemoteComponent) => {
  const parameterSchema: { [key: string]: Joi.Schema } = {};
  const parameter: RemoteComponent['parameter'] = data?.parameter || {};
  // eslint-disable-next-line no-restricted-syntax, guard-for-in
  for (const key in parameter) {
    parameterSchema[key] = checkJsonSchema(parameter[key]);
  }

  return Joi.object<RemoteComponent>({
    name: Joi.string().required(),
    url: Joi.string().required(),
    description: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    parameter: Joi.object(parameterSchema),
  }).unknown(true);
};

export default schema;
