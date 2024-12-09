import { ParameterObject, ResponsesObject, SchemaObject } from '@blocklet/dataset-sdk/types';

const resolveSchema = (schema: SchemaObject): SchemaObject => {
  if (!schema) return schema;
  if (schema.type === 'object' && schema.properties) {
    const properties: Record<string, SchemaObject> = {};

    Object.entries(schema.properties).forEach(([key, value]) => {
      properties[key] = resolveSchema(value as SchemaObject);
    });
    return { ...schema, properties };
  }

  if (schema.type === 'array' && schema.items) {
    return { ...schema, items: resolveSchema(schema.items as SchemaObject) };
  }

  return schema;
};

const parametersToSchema = (parameters: ParameterObject[]) => {
  if (!parameters.length) return null;

  const schema = {
    type: 'object',
    properties: {},
    required: [],
  } as { type: 'object'; properties: Record<string, SchemaObject>; required: string[] };

  parameters.forEach((param) => {
    const { name, required, schema: s } = param;
    if (s) schema.properties[name] = resolveSchema(s as SchemaObject);
    if (required) schema.required.push(name);
  });

  return schema;
};

const responsesToSchema = (responses: ResponsesObject) => {
  const schema = responses?.['200']?.content?.['application/json']?.schema;
  return schema ?? null;
};

export { parametersToSchema, responsesToSchema };
