import Joi from 'joi';
import { toLower } from 'lodash';

import type { Assistant, OutputVariable, Variable } from '..';

export const variableBlockListForAgent: {
  [key in Assistant['type']]?: { block?: Set<RuntimeOutputVariable>; allow?: Set<RuntimeOutputVariable> };
} = {
  prompt: {
    // block: new Set(['$images']),
  },
  image: {
    // allow: new Set(['$images']),
  },
};

type OmitUnion<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

export const runtimeVariablesSchema: { [key in RuntimeOutputVariable]?: OmitUnion<OutputVariable, 'id'> } = {
  '$suggested.questions': {
    type: 'array',
    description: 'Generate 3 questions for users to ask you based on answers and context',
    element: {
      id: '',
      type: 'object',
      properties: [
        {
          id: '',
          type: 'string',
          name: 'question',
          required: true,
        },
      ],
    },
    required: true,
  },
  '$reference.links': {
    type: 'array',
    description: 'List all referenced links in the generated text',
    element: {
      id: '',
      type: 'object',
      properties: [
        {
          id: '',
          type: 'string',
          name: 'title',
        },
        {
          id: '',
          type: 'string',
          name: 'url',
          required: true,
        },
      ],
    },
    required: true,
  },
  // '$page.background.image': {
  //   type: 'string',
  //   description: 'background image of page',
  // },
  // '$page.background.color': {
  //   type: 'string',
  //   description: 'background color of page',
  // },
  // $input: {
  //   type: 'object',
  //   description: 'Next input method',
  //   properties: [
  //     {
  //       id: '',
  //       name: 'type',
  //       type: 'string',
  //       description: 'Input method, enum: ["select"]',
  //       required: true,
  //     },
  //     {
  //       id: '',
  //       name: 'options',
  //       type: 'array',
  //       element: {
  //         id: '',
  //         type: 'object',
  //         properties: [
  //           {
  //             id: '',
  //             name: 'title',
  //             type: 'string',
  //             description: 'Option title',
  //             required: true,
  //           },
  //           {
  //             id: '',
  //             type: 'object',
  //             name: 'action',
  //             description: 'Option action',
  //             required: true,
  //             properties: [
  //               {
  //                 id: '',
  //                 name: 'type',
  //                 type: 'string',
  //                 description: 'Action type, enum: ["navigateTo"]',
  //                 required: true,
  //               },
  //               {
  //                 id: '',
  //                 name: 'to',
  //                 type: 'object',
  //                 description: 'Navigate to, required if type is "navigateTo"',
  //                 properties: [
  //                   {
  //                     id: '',
  //                     name: 'type',
  //                     type: 'string',
  //                     description: 'Navigation target type, enum: ["assistant"]',
  //                     required: true,
  //                   },
  //                   {
  //                     id: '',
  //                     name: 'assistantId',
  //                     type: 'string',
  //                     description: 'Navigate to which assistant, required if type is "assistant"',
  //                   },
  //                 ],
  //               },
  //             ],
  //           },
  //         ],
  //         required: true,
  //       },
  //       required: true,
  //     },
  //   ],
  // },
};

export function outputVariablesToJsonSchema(variables: OutputVariable[], datastoreVariables: Variable[]) {
  const variableToSchema = (variable: OmitUnion<OutputVariable, 'id'>): object | undefined => {
    if (variable.name && isRuntimeOutputVariable(variable.name)) {
      const runtimeVariable = runtimeVariablesSchema[variable.name as RuntimeOutputVariable];
      if (!runtimeVariable) return undefined;

      return variableToSchema({
        ...runtimeVariable,
        description: [runtimeVariable.description, variable.description].filter((i) => !!i).join('\n'),
      });
    }

    if (variable.variable) {
      const { key, scope } = variable.variable;
      const v = datastoreVariables.find((i) => toLower(i.key) === toLower(key) && i.scope === scope);
      if (!v?.type) return undefined;

      return variableToSchema(v.type);
    }

    return {
      type: variable.type,
      description: variable.description,
      properties:
        variable.type === 'object' && variable.properties
          ? Object.fromEntries(
              variable.properties
                .map((property) => [property.name, variableToSchema(property)] as const)
                .filter((i) => i[0] && i[1])
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

export function outputVariablesToJoiSchema(variables: OutputVariable[], datastoreVariables: Variable[]): Joi.AnySchema {
  const variableToSchema = (variable: OmitUnion<OutputVariable, 'id'>): Joi.AnySchema | undefined => {
    let schema: Joi.AnySchema | undefined;

    if (variable.name && isRuntimeOutputVariable(variable.name)) {
      const runtimeVariable = runtimeVariablesSchema[variable.name as RuntimeOutputVariable];
      if (!runtimeVariable) return undefined;

      schema = variableToSchema({ ...runtimeVariable });
      if (schema) {
        schema = Joi.alternatives().try(schema, Joi.any().empty(Joi.any()));
      }
      return schema;
    }

    if (variable.variable) {
      const { key, scope } = variable.variable;

      const v = datastoreVariables.find((i) => toLower(i.key) === toLower(key) && i.scope === scope);
      if (!v?.type) return undefined;

      schema = variableToSchema(v.type);
    } else if (variable.type === 'string') {
      schema = Joi.string().empty([null, '']);
    } else if (variable.type === 'number') {
      schema = Joi.number().empty([null, '']);
    } else if (variable.type === 'object') {
      schema = Joi.object(
        Object.fromEntries(
          (variable.properties ?? [])
            .map((property) => [property.name, variableToSchema(property)] as const)
            .filter((i) => i[0] && i[1])
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

    if ('defaultValue' in variable) {
      schema = schema.default(variable.defaultValue);
    }

    if (variable.required) {
      schema = schema.required();
    }

    return schema;
  };

  return variableToSchema({ type: 'object', properties: variables ?? [] })!;
}

export enum RuntimeOutputVariable {
  text = '$text',
  images = '$images',
  suggestedQuestions = '$suggested.questions',
  referenceLinks = '$reference.links',
  display = '$display',
}

export function isRuntimeOutputVariable(variable: string): variable is RuntimeOutputVariable {
  return Object.values(RuntimeOutputVariable).includes(variable as RuntimeOutputVariable);
}

export interface OutputDisplayPreference {
  page?: OutputDisplayPreferenceItem;
  inputs?: OutputDisplayPreferenceItem;
  outputs?: OutputDisplayPreferenceItem;
}

export interface OutputDisplayPreferenceItem {
  componentId?: string;
}

export interface RuntimeOutputVariablesSchema {
  [RuntimeOutputVariable.images]?: { url: string }[];
  [RuntimeOutputVariable.suggestedQuestions]?: { question: string }[];
  [RuntimeOutputVariable.referenceLinks]?: { title?: string; url: string }[];
  [RuntimeOutputVariable.display]?: OutputDisplayPreference;
}

// export type Action =
//   | {
//       type: 'navigateTo';
//       to: {
//         type: 'assistant';
//         assistantId: string;
//       };
//     }
//   | {
//       type: 'navigateBack';
//     };

// export type Input = {
//   type: 'select';
//   options: {
//     title: string;
//     action: Action;
//   }[];
// };
