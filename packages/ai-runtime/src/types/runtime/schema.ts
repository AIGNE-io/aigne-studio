import { ChatCompletionResponse } from '@blocklet/ai-kit/api/types/chat';
import Joi from 'joi';
import { toLower } from 'lodash';
import { nanoid } from 'nanoid';

import type { Assistant, OutputVariable, Variable, VariableTypeYjs } from '..';

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
  $text: {
    type: 'string',
    description: 'Text Stream',
  },
  $images: {
    type: 'array',
    description: 'Generated Images',
    element: {
      id: '',
      type: 'object',
      properties: [
        {
          id: '',
          type: 'string',
          name: 'url',
          description: 'Image Url',
          required: true,
        },
      ],
    },
  },
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
};

export function outputVariablesToJsonSchema(
  assistant: Assistant,
  datastoreVariables: Variable[]
): { type: 'object'; properties: { [key: string]: any } } | undefined {
  const variableToSchema = (variable: OmitUnion<OutputVariable, 'id'>): any => {
    if (variable.from?.type === 'input') return undefined;
    if (ignoreJsonSchemaOutputs.has(variable.name as RuntimeOutputVariable)) return undefined;

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
      type: variable.type || 'string',
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
          ? variable.properties
              .filter(
                (i) =>
                  i.name &&
                  (i.required ||
                    (runtimeOutputVariableSet.has(i.name as RuntimeOutputVariable) &&
                      runtimeVariablesSchema[i.name as RuntimeOutputVariable] &&
                      !ignoreJsonSchemaOutputs.has(i.name as RuntimeOutputVariable)))
              )
              .map((i) => i.name)
          : undefined,
    };
  };

  return variableToSchema({ type: 'object', properties: assistant.outputVariables });
}

export function outputVariablesToJoiSchema(assistant: Assistant, datastoreVariables: Variable[]): Joi.AnySchema {
  const variableToSchema = (variable: OmitUnion<OutputVariable, 'id'>): Joi.AnySchema | undefined => {
    let schema: Joi.AnySchema | undefined;

    if (variable.from?.type === 'input') {
      const input = assistant.parameters?.find((i) => i.id === variable.from?.id);
      if (input) {
        return Joi.any();
      }

      return undefined;
    }

    if (variable.name && isRuntimeOutputVariable(variable.name)) {
      if (variable.name === RuntimeOutputVariable.llmResponseStream) {
        schema = Joi.any();
      } else {
        const runtimeVariable = runtimeVariablesSchema[variable.name as RuntimeOutputVariable];
        if (!runtimeVariable) return undefined;

        schema = variableToSchema({ ...runtimeVariable });
        if (schema) {
          schema = Joi.alternatives().try(schema, Joi.any().empty(Joi.any()));
        }
      }
      return schema;
    }

    if (variable.variable) {
      const { key, scope } = variable.variable;

      const v = datastoreVariables.find((i) => toLower(i.key) === toLower(key) && i.scope === scope);
      if (!v?.type) return undefined;

      schema = variableToSchema(v.type);
    } else if (!variable.type || variable.type === 'string') {
      schema = Joi.string().empty([null, '']);
    } else if (variable.type === 'number') {
      schema = Joi.number().empty([null, '']);
    } else if (variable.type === 'boolean') {
      schema = Joi.boolean().empty([null, '']);
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

  return variableToSchema({ type: 'object', properties: assistant.outputVariables ?? [] })!;
}

type JSONSchema = {
  type: string;
  description?: string;
  properties?: { [key: string]: JSONSchema };
  items?: JSONSchema;
  required?: string[];
  [key: string]: any;
};

export function outputVariablesFromOpenApi(schema?: JSONSchema, name: string = '', id: string = ''): VariableTypeYjs {
  const currentId = id || nanoid();

  if (schema?.type === 'object' && schema?.properties) {
    const properties: {
      [key: string]: {
        index: number;
        data: VariableTypeYjs;
      };
    } = {};

    const p = schema?.properties || {};
    Object.entries(p).forEach(([key, value], index) => {
      const id = nanoid();
      properties[id] = { index, data: outputVariablesFromOpenApi(value, key, id) };
    });

    return {
      id: currentId,
      name,
      description: schema.description,
      required: schema.required?.includes(name),
      type: 'object',
      properties,
    };
  }

  if (schema?.type === 'array' && schema?.items) {
    return {
      id: currentId,
      name,
      description: schema.description,
      required: schema.required?.includes(name),
      type: 'array',
      element: outputVariablesFromOpenApi(schema.items, 'element'),
    };
  }

  let type: 'string' | 'number' | 'boolean' | undefined;
  switch (schema?.type) {
    case 'string':
      type = 'string';
      break;
    case 'number':
      type = 'number';
      break;
    case 'boolean':
      type = 'boolean';
      break;
    default:
      console.warn('Unsupported event', type);
  }

  return {
    id: currentId,
    name,
    description: schema?.description,
    required: schema?.required?.includes(name),
    type,
  };
}

export enum RuntimeOutputVariable {
  llmResponseStream = '$llmResponseStream',
  text = '$text',
  images = '$images',
  suggestedQuestions = '$suggested.questions',
  referenceLinks = '$reference.links',
  appearancePage = '$appearance.page',
  appearanceInput = '$appearance.input',
  appearanceOutput = '$appearance.output',
  children = '$children',
  share = '$share',
  openingQuestions = '$openingQuestions',
  openingMessage = '$openingMessage',
  profile = '$profile',
}

const runtimeOutputVariableSet = new Set(Object.values(RuntimeOutputVariable));

const ignoreJsonSchemaOutputs: Set<RuntimeOutputVariable> = new Set([
  RuntimeOutputVariable.text,
  RuntimeOutputVariable.images,
]);

export function isRuntimeOutputVariable(variable: string): variable is RuntimeOutputVariable {
  return Object.values(RuntimeOutputVariable).includes(variable as RuntimeOutputVariable);
}

export interface RuntimeOutputAppearance {
  componentBlockletDid?: string;
  componentId?: string;
  componentName?: string;
  componentProperties?: { [key: string]: any };
  componentProps?: { [key: string]: any };
  title?: string;
  icon?: string;
}

export interface RuntimeOutputChildren {
  agents?: { id: string; name?: string }[];
}

export interface RuntimeOutputShare {
  items?: { to: string }[];
}

export interface RuntimeOutputOpeningQuestions {
  items?: { id: string; title?: string; parameters?: any }[];
}

export interface RuntimeOutputOpeningMessage {
  message?: string;
}

export interface RuntimeOutputProfile {
  avatar?: string;
  name?: string;
}

export interface RuntimeOutputVariablesSchema {
  [RuntimeOutputVariable.llmResponseStream]?: ReadableStream<ChatCompletionResponse>;
  [RuntimeOutputVariable.text]?: string;
  [RuntimeOutputVariable.images]?: { url: string }[];
  [RuntimeOutputVariable.suggestedQuestions]?: { question: string }[];
  [RuntimeOutputVariable.referenceLinks]?: { title?: string; url: string }[];
  [RuntimeOutputVariable.appearancePage]?: undefined;
  [RuntimeOutputVariable.appearanceInput]?: undefined;
  [RuntimeOutputVariable.appearanceOutput]?: undefined;
  [RuntimeOutputVariable.children]?: RuntimeOutputChildren;
  [RuntimeOutputVariable.share]?: RuntimeOutputShare;
  [RuntimeOutputVariable.openingQuestions]?: RuntimeOutputOpeningQuestions;
  [RuntimeOutputVariable.openingMessage]?: RuntimeOutputOpeningMessage;
  [RuntimeOutputVariable.profile]?: RuntimeOutputProfile;
}
