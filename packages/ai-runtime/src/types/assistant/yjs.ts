import type {
  ApiAssistant,
  ExecuteBlock,
  ExecuteBlockSelectAll,
  ExecuteBlockSelectByPrompt,
  FunctionAssistant,
  ImageAssistant,
  Parameter,
  PromptAssistant,
  PromptMessage,
  SelectParameter,
} from '.';

export type ArrayToYjs<T extends Array<{ id: string }>> = { [key: string]: { index: number; data: T[number] } };

export type FileTypeYjs = AssistantYjs | { $base64: string };

export type AssistantYjs = PromptAssistantYjs | ApiAssistantYjs | FunctionAssistantYjs | ImageAssistantYjs;

export type ExecuteBlockSelectAllYjs = Omit<ExecuteBlockSelectAll, 'tools'> & {
  tools?: { [key: string]: { index: number; data: NonNullable<ExecuteBlock['tools']>[number] } };
};

export type ExecuteBlockSelectByPromptYjs = Omit<ExecuteBlockSelectByPrompt, 'tools'> & {
  tools?: { [key: string]: { index: number; data: NonNullable<ExecuteBlock['tools']>[number] } };
};

export type ExecuteBlockYjs = ExecuteBlockSelectAllYjs | ExecuteBlockSelectByPromptYjs;

export type PromptYjs =
  | {
      type: 'message';
      data: PromptMessage;
      visibility?: 'hidden';
    }
  | {
      type: 'executeBlock';
      data: ExecuteBlockYjs;
      visibility?: 'hidden';
    };

export interface PromptAssistantYjs extends Omit<PromptAssistant, 'parameters' | 'prompts' | 'tests'> {
  parameters?: { [key: string]: { index: number; data: ParameterYjs } };
  prompts?: { [key: string]: { index: number; data: PromptYjs } };
  tests?: ArrayToYjs<NonNullable<PromptAssistant['tests']>>;
}

export interface ImageAssistantYjs extends Omit<ImageAssistant, 'parameters' | 'prepareExecutes' | 'tests'> {
  parameters?: { [key: string]: { index: number; data: ParameterYjs } };
  prepareExecutes?: { [key: string]: { index: number; data: ExecuteBlockYjs } };
  tests?: ArrayToYjs<NonNullable<FunctionAssistant['tests']>>;
}

export interface ApiAssistantYjs
  extends Omit<ApiAssistant, 'parameters' | 'prepareExecutes' | 'tests' | 'requestParameters'> {
  parameters?: { [key: string]: { index: number; data: ParameterYjs } };
  prepareExecutes?: { [key: string]: { index: number; data: ExecuteBlockYjs } };
  tests?: ArrayToYjs<NonNullable<ApiAssistant['tests']>>;
  requestParameters?: ArrayToYjs<NonNullable<ApiAssistant['requestParameters']>>;
}

export interface FunctionAssistantYjs extends Omit<FunctionAssistant, 'parameters' | 'prepareExecutes' | 'tests'> {
  parameters?: { [key: string]: { index: number; data: ParameterYjs } };
  prepareExecutes?: { [key: string]: { index: number; data: ExecuteBlockYjs } };
  tests?: ArrayToYjs<NonNullable<FunctionAssistant['tests']>>;
}

export type ParameterYjs =
  | Exclude<Parameter, { type: 'select' }>
  | (Omit<SelectParameter, 'options'> & { options?: ArrayToYjs<NonNullable<SelectParameter['options']>> });
