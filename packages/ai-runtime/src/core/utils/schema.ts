import Joi from 'joi';

import { OutputVariable } from '../../types';

export function outputVariablesToJsonSchema(variables: OutputVariable[]) {
  const variableToSchema = (variable: OutputVariable): any => ({
    type: variable.type,
    description: variable.description,
    properties:
      variable.type === 'object' && variable.properties
        ? Object.fromEntries(
            variable.properties.map((property) => [property.name, variableToSchema(property)]).filter((i) => !!i[0])
          )
        : undefined,
    items: variable.type === 'array' && variable.element ? variableToSchema(variable.element) : undefined,
    required:
      variable.type === 'object' && variable.properties?.length
        ? variable.properties.filter((i) => i.name && i.required).map((i) => i.name)
        : undefined,
  });

  return variableToSchema({ id: '', type: 'object', properties: variables });
}

export function outputVariablesToJoiSchema(variables: OutputVariable[]): Joi.AnySchema {
  const variableToSchema = (variable: OutputVariable): Joi.AnySchema | undefined => {
    let schema: Joi.AnySchema | undefined;

    if (variable.type === 'string') {
      schema = Joi.string().empty([null, '']);
    } else if (variable.type === 'number') {
      schema = Joi.number().empty([null, '']);
    } else if (variable.type === 'object') {
      schema = Joi.object(
        variable.properties &&
          Object.fromEntries(
            variable.properties.map((property) => (property.name ? [property.name, variableToSchema(property)] : []))
          )
      )
        .empty([null, ''])
        .options({ allowUnknown: true });
    } else if (variable.type === 'array') {
      schema = Joi.array()
        .empty([null, ''])
        .items((variable.element && variableToSchema(variable.element)) || Joi.string().empty([null, '']));
    }

    if (!schema) return undefined;

    if (variable.required) schema.required();

    return schema;
  };

  return variableToSchema({ id: '', type: 'object', properties: variables ?? [] })!;
}
