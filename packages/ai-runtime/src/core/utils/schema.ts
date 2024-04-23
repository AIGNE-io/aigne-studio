import Joi from 'joi';

import { OutputVariable } from '../../types';
import { RuntimeOutputVariable } from '../../types/runtime';

type OmitUnion<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

const runtimeVariablesSchema: Record<RuntimeOutputVariable, OmitUnion<OutputVariable, 'id'>> = {
  '$page.background.image': {
    type: 'string',
    description: 'background image of page',
  },
  '$page.background.color': {
    type: 'string',
    description: 'background color of page',
  },
  $input: {
    type: 'object',
    description: 'Next input method',
    properties: [
      {
        id: '',
        name: 'type',
        type: 'string',
        description: 'Input method, enum: ["select"]',
        required: true,
      },
      {
        id: '',
        name: 'options',
        type: 'array',
        element: {
          id: '',
          type: 'object',
          properties: [
            {
              id: '',
              name: 'title',
              type: 'string',
              description: 'Option title',
              required: true,
            },
            {
              id: '',
              type: 'object',
              name: 'action',
              description: 'Option action',
              required: true,
              properties: [
                {
                  id: '',
                  name: 'type',
                  type: 'string',
                  description: 'Action type, enum: ["navigateTo"]',
                  required: true,
                },
                {
                  id: '',
                  name: 'to',
                  type: 'object',
                  description: 'Navigate to, required if type is "navigateTo"',
                  properties: [
                    {
                      id: '',
                      name: 'type',
                      type: 'string',
                      description: 'Navigation target type, enum: ["assistant"]',
                      required: true,
                    },
                    {
                      id: '',
                      name: 'assistantId',
                      type: 'string',
                      description: 'Navigate to which assistant, required if type is "assistant"',
                    },
                  ],
                },
              ],
            },
          ],
          required: true,
        },
        required: true,
      },
    ],
  },
};

export function outputVariablesToJsonSchema(variables: OutputVariable[]) {
  const variableToSchema = (variable: OmitUnion<OutputVariable, 'id'>): any => {
    const runtimeVariable = runtimeVariablesSchema[variable.name as RuntimeOutputVariable];
    if (runtimeVariable) {
      return variableToSchema({
        ...runtimeVariable,
        description: [runtimeVariable.description, variable.description].filter((i) => !!i).join('\n'),
      });
    }

    return {
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
    };
  };

  return variableToSchema({ type: 'object', properties: variables });
}

export function outputVariablesToJoiSchema(variables: OutputVariable[]): Joi.AnySchema {
  const variableToSchema = (variable: OmitUnion<OutputVariable, 'id'>): Joi.AnySchema | undefined => {
    let schema: Joi.AnySchema | undefined;

    const runtimeVariable = runtimeVariablesSchema[variable.name as RuntimeOutputVariable];

    if (runtimeVariable) {
      schema = variableToSchema({ ...runtimeVariable, required: variable.required });
    } else if (variable.type === 'string') {
      schema = Joi.string().empty([null, '']);
    } else if (variable.type === 'number') {
      schema = Joi.number().empty([null, '']);
    } else if (variable.type === 'object') {
      schema = Joi.object(
        Object.fromEntries(
          (variable.properties ?? [])
            .filter((i) => i.name)
            .map((property) => [property.name, variableToSchema(property)])
        )
      )
        .empty([null, ''])
        .options({ stripUnknown: true });
    } else if (variable.type === 'array') {
      schema = Joi.array()
        .empty([null, ''])
        .items((variable.element && variableToSchema(variable.element)) || Joi.string().empty([null, '']));
    }

    if (!schema) return undefined;

    if (variable.required) {
      schema = schema.required();
    }

    return schema;
  };

  return variableToSchema({ type: 'object', properties: variables ?? [] })!;
}
