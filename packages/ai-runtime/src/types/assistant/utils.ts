import dayjs from 'dayjs';
import sortBy from 'lodash/sortBy';
import { customAlphabet } from 'nanoid';

import { RuntimeOutputVariable, RuntimeOutputVariablesSchema } from '../runtime';
import type {
  AgentYjs,
  ApiAssistantYjs,
  AssistantYjs,
  CallAssistantYjs,
  ExecuteBlockYjs,
  FileTypeYjs,
  FunctionAssistantYjs,
  ImageAssistantYjs,
  MemoryFileYjs,
  OutputVariableYjs,
  ParameterYjs,
  PromptAssistantYjs,
  PromptYjs,
  RouterAssistantYjs,
  RuntimeOutputVariablesSchemaYjs,
  VariableTypeYjs,
  VariableYjs,
} from './yjs';
import type {
  Agent,
  ApiAssistant,
  Assistant,
  CallAssistant,
  ExecuteBlock,
  FileType,
  FunctionAssistant,
  ImageAssistant,
  MemoryFile,
  OutputVariable,
  Parameter,
  Prompt,
  PromptAssistant,
  RouterAssistant,
  Variable,
  VariableType,
} from '.';

export const randomId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');

export const nextAssistantId = () => `${dayjs().format('YYYYMMDDHHmmss')}-${randomId(6)}`;

export function isPromptMessage(prompt: Prompt): prompt is Extract<Prompt, { type: 'message' }>;
export function isPromptMessage(prompt: PromptYjs): prompt is Extract<PromptYjs, { type: 'message' }>;
export function isPromptMessage(
  prompt: Prompt | PromptYjs
): prompt is Extract<Prompt | PromptYjs, { type: 'message' }> {
  return prompt.type === 'message';
}

export function isExecuteBlock(prompt: Prompt): prompt is Extract<Prompt, { type: 'executeBlock' }>;
export function isExecuteBlock(prompt: PromptYjs): prompt is Extract<PromptYjs, { type: 'executeBlock' }>;
export function isExecuteBlock(
  prompt: Prompt | PromptYjs
): prompt is Extract<Prompt | PromptYjs, { type: 'executeBlock' }> {
  return prompt.type === 'executeBlock';
}

export function isVariables(assistant: FileType): assistant is MemoryFile;
export function isVariables(assistant: FileTypeYjs): assistant is MemoryFileYjs;
export function isVariables(assistant: FileType | FileTypeYjs): assistant is FileType | MemoryFileYjs {
  return 'variables' in assistant && Array.isArray(assistant.variables);
}

export function isAssistant(assistant: FileType): assistant is Assistant;
export function isAssistant(assistant: FileTypeYjs): assistant is AssistantYjs;
export function isAssistant(assistant: FileType | FileTypeYjs): assistant is FileType | AssistantYjs {
  return (
    typeof (assistant as any).id === 'string' &&
    ['agent', 'prompt', 'image', 'api', 'function', 'router', 'callAgent'].includes((assistant as any).type)
  );
}

export function isAgent(file: FileType): file is Agent;
export function isAgent(file: FileTypeYjs): file is AgentYjs;
export function isAgent(file: FileType | FileTypeYjs): file is Agent | AgentYjs {
  return (file as any).type === 'agent';
}

export function isRouterAssistant(file: FileType): file is RouterAssistant;
export function isRouterAssistant(file: FileTypeYjs): file is RouterAssistantYjs;
export function isRouterAssistant(file: FileType | FileTypeYjs): file is RouterAssistant | RouterAssistantYjs {
  return (file as any).type === 'router';
}

export function isCallAssistant(file: FileType): file is CallAssistant;
export function isCallAssistant(file: FileTypeYjs): file is CallAssistantYjs;
export function isCallAssistant(file: FileType | FileTypeYjs): file is CallAssistant | CallAssistantYjs {
  return (file as any).type === 'callAgent';
}

export function isPromptAssistant(file: FileType): file is PromptAssistant;
export function isPromptAssistant(file: FileTypeYjs): file is PromptAssistantYjs;
export function isPromptAssistant(file: FileType | FileTypeYjs): file is PromptAssistant | PromptAssistantYjs {
  return (file as any).type === 'prompt';
}

export function isImageAssistant(file: FileType): file is ImageAssistant;
export function isImageAssistant(file: FileTypeYjs): file is ImageAssistantYjs;
export function isImageAssistant(file: FileType | FileTypeYjs): file is ImageAssistant | ImageAssistantYjs {
  return (file as any).type === 'image';
}

export function isApiAssistant(file: FileType): file is ApiAssistant;
export function isApiAssistant(file: FileTypeYjs): file is ApiAssistantYjs;
export function isApiAssistant(file: FileType | FileTypeYjs): file is ApiAssistant | ApiAssistantYjs {
  return (file as any).type === 'api';
}

export function isFunctionAssistant(file: FileType): file is FunctionAssistant;
export function isFunctionAssistant(file: FileTypeYjs): file is FunctionAssistantYjs;
export function isFunctionAssistant(file: FileType | FileTypeYjs): file is FunctionAssistant | FunctionAssistantYjs {
  return (file as any).type === 'function';
}

export function isRawFile(file: FileType): file is { $base64: string };
export function isRawFile(file: FileTypeYjs): file is { $base64: string };
export function isRawFile(file: FileType | FileTypeYjs): file is { $base64: string } {
  return typeof (file as any).$base64 === 'string';
}

export function parameterToYjs(parameter: Parameter): ParameterYjs {
  return parameter.type === 'select'
    ? {
        ...parameter,
        options:
          parameter.options &&
          Object.fromEntries(parameter.options.map((option, index) => [option.id, { index, data: option }])),
      }
    : parameter;
}

export function parameterFromYjs(parameter: ParameterYjs): Parameter {
  return parameter.type === 'select'
    ? {
        ...parameter,
        options: parameter.options && sortBy(Object.values(parameter.options), (i) => i.index).map((i) => i.data),
      }
    : parameter;
}

export function parametersToYjs(parameters: Parameter[]): { [key: string]: { index: number; data: ParameterYjs } } {
  return arrayToYjs(parameters.map(parameterToYjs));
}

export function parametersFromYjs(parameters: { [key: string]: { index: number; data: ParameterYjs } }): Parameter[] {
  return sortBy(Object.values(parameters), (i) => i.index).map(({ data }) => parameterFromYjs(data));
}

export function executeBlockToYjs(block: ExecuteBlock): ExecuteBlockYjs {
  return {
    ...block,
    tools: block.tools && arrayToYjs(block.tools),
  };
}

export function executeBlockFromYjs(block: ExecuteBlockYjs): ExecuteBlock {
  return {
    ...block,
    tools: block.tools && arrayFromYjs(block.tools),
  };
}

export function outputVariableInitialValueToYjs(output: OutputVariable): OutputVariableYjs['initialValue'] {
  if (output.name === RuntimeOutputVariable.openingQuestions) {
    const initialValue = output.initialValue as
      | RuntimeOutputVariablesSchema[RuntimeOutputVariable.openingQuestions]
      | undefined;
    return {
      ...initialValue,
      items: initialValue?.items && arrayToYjs(initialValue.items),
    };
  }

  return output.initialValue as any;
}

export function outputVariableInitialValueFromYjs(output: OutputVariableYjs): OutputVariable['initialValue'] {
  if (output.name === RuntimeOutputVariable.openingQuestions) {
    const initialValue = output.initialValue as
      | RuntimeOutputVariablesSchemaYjs[RuntimeOutputVariable.openingQuestions]
      | undefined;

    return {
      ...initialValue,
      items: initialValue?.items && arrayFromYjs(initialValue.items),
    };
  }

  return output.initialValue as any;
}

export function variableTypeToYjs(variable: VariableType): VariableTypeYjs {
  if (variable.type === 'object') {
    return {
      ...variable,
      properties: variable.properties && arrayToYjs(variable.properties.map(outputVariableToYjs)),
    };
  }

  if (variable.type === 'array') {
    return {
      ...variable,
      element: variable.element && outputVariableToYjs(variable.element),
    };
  }

  return variable;
}

export function variableTypeFromYjs(variable: VariableTypeYjs): VariableType {
  if (variable.type === 'object') {
    return {
      ...variable,
      properties: variable.properties && arrayFromYjs(variable.properties).map(outputVariableFromYjs),
    };
  }

  if (variable.type === 'array') {
    return {
      ...variable,
      element: variable.element && outputVariableFromYjs(variable.element),
    };
  }

  return variable;
}

export function variableToYjs(variable: Variable): VariableYjs {
  return { ...variable, type: variable.type && variableTypeToYjs(variable.type) };
}

export function variableFromYjs(variable: VariableYjs): Variable {
  return { ...variable, type: variable.type && variableTypeFromYjs(variable.type) };
}

export function outputVariableToYjs(variable: OutputVariable): OutputVariableYjs {
  return { ...variableTypeToYjs(variable), initialValue: outputVariableInitialValueToYjs(variable) };
}

export function outputVariableFromYjs(variable: OutputVariableYjs): OutputVariable {
  return { ...variableTypeFromYjs(variable), initialValue: outputVariableInitialValueFromYjs(variable) };
}

export function promptToYjs(prompt: Prompt): PromptYjs {
  if (isExecuteBlock(prompt)) {
    return { ...prompt, data: executeBlockToYjs(prompt.data) };
  }
  return prompt;
}

export function promptFromYjs(prompt: PromptYjs): Prompt {
  if (isExecuteBlock(prompt)) {
    return { ...prompt, data: executeBlockFromYjs(prompt.data) };
  }
  return prompt;
}

export function arrayToYjs<T extends { id: string }>(arr: T[]): { [key: string]: { index: number; data: T } };
export function arrayToYjs<T extends { id: string }, I>(
  arr: T[],
  iter: (item: T) => I
): { [key: string]: { index: number; data: I } };
export function arrayToYjs<T extends { id: string }, I>(
  arr: T[],
  iter?: (item: T) => I
): { [key: string]: { index: number; data: I | T } } {
  return Object.fromEntries(arr.map((data, index) => [data.id, { index, data: iter ? iter(data) : data }]));
}

export function arrayFromYjs<T>(arr: { [key: string]: { index: number; data: T } }): T[];
export function arrayFromYjs<T, I>(arr: { [key: string]: { index: number; data: T } }, iter: (item: T) => I): I[];
export function arrayFromYjs<T, I>(
  arr: { [key: string]: { index: number; data: T } },
  iter?: (item: T) => I
): (T | I)[] {
  return sortBy(Object.values(arr), (i) => i.index).map(({ data }) => (iter ? iter(data) : data));
}

export function fileToYjs(file: FileType): FileTypeYjs {
  if (isAgent(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayToYjs(file.parameters, parameterToYjs),
      tests: file.tests && arrayToYjs(file.tests),
      entries: file.entries && arrayToYjs(file.entries),
      outputVariables: file.outputVariables && arrayToYjs(file.outputVariables.map(outputVariableToYjs)),
    };
  }
  if (isPromptAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayToYjs(file.parameters, parameterToYjs),
      prompts:
        file.prompts &&
        arrayToYjs(
          file.prompts.map((i) => ({ id: i.data.id, data: i })),
          (i) => promptToYjs(i.data)
        ),
      tests: file.tests && arrayToYjs(file.tests),
      entries: file.entries && arrayToYjs(file.entries),
      outputVariables: file.outputVariables && arrayToYjs(file.outputVariables.map(outputVariableToYjs)),
    };
  }
  if (isImageAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayToYjs(file.parameters, parameterToYjs),
      prepareExecutes: file.prepareExecutes && arrayToYjs(file.prepareExecutes, executeBlockToYjs),
      tests: file.tests && arrayToYjs(file.tests),
      entries: file.entries && arrayToYjs(file.entries),
      outputVariables: file.outputVariables && arrayToYjs(file.outputVariables.map(outputVariableToYjs)),
    };
  }
  if (isFunctionAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayToYjs(file.parameters, parameterToYjs),
      prepareExecutes: file.prepareExecutes && arrayToYjs(file.prepareExecutes, executeBlockToYjs),
      tests: file.tests && arrayToYjs(file.tests),
      entries: file.entries && arrayToYjs(file.entries),
      outputVariables: file.outputVariables && arrayToYjs(file.outputVariables.map(outputVariableToYjs)),
    };
  }
  if (isApiAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayToYjs(file.parameters, parameterToYjs),
      prepareExecutes: file.prepareExecutes && arrayToYjs(file.prepareExecutes, executeBlockToYjs),
      tests: file.tests && arrayToYjs(file.tests),
      requestParameters: file.requestParameters && arrayToYjs(file.requestParameters),
      entries: file.entries && arrayToYjs(file.entries),
      outputVariables: file.outputVariables && arrayToYjs(file.outputVariables.map(outputVariableToYjs)),
    };
  }

  if (isVariables(file)) {
    return {
      ...file,
      variables: file.variables?.map((i) => ({ ...i, type: i.type && outputVariableToYjs(i.type) })),
    };
  }

  if (isRouterAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayToYjs(file.parameters, parameterToYjs),
      tests: file.tests && arrayToYjs(file.tests),
      entries: file.entries && arrayToYjs(file.entries),
      outputVariables: file.outputVariables && arrayToYjs(file.outputVariables.map(outputVariableToYjs)),
      routes: file.routes && arrayToYjs(file.routes),
    };
  }

  if (isCallAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayToYjs(file.parameters, parameterToYjs),
      tests: file.tests && arrayToYjs(file.tests),
      entries: file.entries && arrayToYjs(file.entries),
      outputVariables: file.outputVariables && arrayToYjs(file.outputVariables.map(outputVariableToYjs)),
      agents: file.agents && arrayToYjs(file.agents),
    };
  }

  return file;
}

export function fileFromYjs(file: FileTypeYjs): FileType {
  if (isAgent(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayFromYjs(file.parameters, parameterFromYjs),
      tests: file.tests && arrayFromYjs(file.tests),
      entries: file.entries && arrayFromYjs(file.entries),
      outputVariables: file.outputVariables && arrayFromYjs(file.outputVariables).map(outputVariableFromYjs),
    };
  }
  if (isPromptAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayFromYjs(file.parameters, parameterFromYjs),
      prompts: file.prompts && arrayFromYjs(file.prompts, promptFromYjs),
      tests: file.tests && arrayFromYjs(file.tests),
      entries: file.entries && arrayFromYjs(file.entries),
      outputVariables: file.outputVariables && arrayFromYjs(file.outputVariables).map(outputVariableFromYjs),
    };
  }
  if (isImageAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayFromYjs(file.parameters, parameterFromYjs),
      prepareExecutes: file.prepareExecutes && arrayFromYjs(file.prepareExecutes, executeBlockFromYjs),
      tests: file.tests && arrayFromYjs(file.tests),
      entries: file.entries && arrayFromYjs(file.entries),
      outputVariables: file.outputVariables && arrayFromYjs(file.outputVariables).map(outputVariableFromYjs),
    };
  }
  if (isFunctionAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayFromYjs(file.parameters, parameterFromYjs),
      prepareExecutes: file.prepareExecutes && arrayFromYjs(file.prepareExecutes, executeBlockFromYjs),
      tests: file.tests && arrayFromYjs(file.tests),
      entries: file.entries && arrayFromYjs(file.entries),
      outputVariables: file.outputVariables && arrayFromYjs(file.outputVariables).map(outputVariableFromYjs),
    };
  }
  if (isApiAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayFromYjs(file.parameters, parameterFromYjs),
      prepareExecutes: file.prepareExecutes && arrayFromYjs(file.prepareExecutes, executeBlockFromYjs),
      tests: file.tests && arrayFromYjs(file.tests),
      requestParameters: file.requestParameters && arrayFromYjs(file.requestParameters),
      entries: file.entries && arrayFromYjs(file.entries),
      outputVariables: file.outputVariables && arrayFromYjs(file.outputVariables).map(outputVariableFromYjs),
    };
  }

  if (isVariables(file)) {
    return {
      ...file,
      variables: file.variables?.map((i) => ({ ...i, type: i.type && outputVariableFromYjs(i.type) })),
    };
  }

  if (isRouterAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayFromYjs(file.parameters, parameterFromYjs),
      tests: file.tests && arrayFromYjs(file.tests),
      entries: file.entries && arrayFromYjs(file.entries),
      outputVariables: file.outputVariables && arrayFromYjs(file.outputVariables).map(outputVariableFromYjs),
      routes: file.routes && arrayFromYjs(file.routes),
    };
  }

  if (isCallAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayFromYjs(file.parameters, parameterFromYjs),
      tests: file.tests && arrayFromYjs(file.tests),
      entries: file.entries && arrayFromYjs(file.entries),
      outputVariables: file.outputVariables && arrayFromYjs(file.outputVariables).map(outputVariableFromYjs),
      agents: file.agents && arrayFromYjs(file.agents),
    };
  }

  return file;
}
