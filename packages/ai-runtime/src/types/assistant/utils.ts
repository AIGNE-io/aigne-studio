import dayjs from 'dayjs';
import sortBy from 'lodash/sortBy';
import { customAlphabet } from 'nanoid';

import type {
  ApiAssistantYjs,
  AssistantYjs,
  ExecuteBlockYjs,
  FileTypeYjs,
  FunctionAssistantYjs,
  ImageAssistantYjs,
  ParameterYjs,
  PromptAssistantYjs,
  PromptYjs,
} from './yjs';
import type {
  ApiAssistant,
  Assistant,
  ExecuteBlock,
  FileType,
  FunctionAssistant,
  ImageAssistant,
  Parameter,
  Prompt,
  PromptAssistant,
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

export function isAssistant(assistant: FileType): assistant is Assistant;
export function isAssistant(assistant: FileTypeYjs): assistant is AssistantYjs;
export function isAssistant(assistant: FileType | FileTypeYjs): assistant is FileType | AssistantYjs {
  return (
    typeof (assistant as any).id === 'string' &&
    ['prompt', 'image', 'api', 'function'].includes((assistant as any).type)
  );
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
    };
  }
  if (isImageAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayToYjs(file.parameters, parameterToYjs),
      prepareExecutes: file.prepareExecutes && arrayToYjs(file.prepareExecutes, executeBlockToYjs),
      tests: file.tests && arrayToYjs(file.tests),
      entries: file.entries && arrayToYjs(file.entries),
    };
  }
  if (isFunctionAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayToYjs(file.parameters, parameterToYjs),
      prepareExecutes: file.prepareExecutes && arrayToYjs(file.prepareExecutes, executeBlockToYjs),
      tests: file.tests && arrayToYjs(file.tests),
      entries: file.entries && arrayToYjs(file.entries),
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
    };
  }

  return file;
}

export function fileFromYjs(file: FileTypeYjs): FileType {
  if (isPromptAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayFromYjs(file.parameters, parameterFromYjs),
      prompts: file.prompts && arrayFromYjs(file.prompts, promptFromYjs),
      tests: file.tests && arrayFromYjs(file.tests),
      entries: file.entries && arrayFromYjs(file.entries),
    };
  }
  if (isImageAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayFromYjs(file.parameters, parameterFromYjs),
      prepareExecutes: file.prepareExecutes && arrayFromYjs(file.prepareExecutes, executeBlockFromYjs),
      tests: file.tests && arrayFromYjs(file.tests),
      entries: file.entries && arrayFromYjs(file.entries),
    };
  }
  if (isFunctionAssistant(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayFromYjs(file.parameters, parameterFromYjs),
      prepareExecutes: file.prepareExecutes && arrayFromYjs(file.prepareExecutes, executeBlockFromYjs),
      tests: file.tests && arrayFromYjs(file.tests),
      entries: file.entries && arrayFromYjs(file.entries),
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
    };
  }

  return file;
}
