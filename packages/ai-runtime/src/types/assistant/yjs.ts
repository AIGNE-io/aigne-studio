import type { ApiFile, ExecuteBlock, FunctionFile, Parameter, PromptFile, PromptMessage, SelectParameter } from '.';

export type ArrayToYjs<T extends Array<{ id: string }>> = { [key: string]: { index: number; data: T[number] } };

export type FileTypeYjs = AssistantYjs | { $base64: string };

export type AssistantYjs = PromptFileYjs | ApiFileYjs | FunctionFileYjs;

export interface ExecuteBlockYjs extends Omit<ExecuteBlock, 'tools'> {
  tools?: { [key: string]: { index: number; data: NonNullable<ExecuteBlock['tools']>[number] } };
}

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

export interface PromptFileYjs extends Omit<PromptFile, 'parameters' | 'prompts' | 'tests'> {
  parameters?: { [key: string]: { index: number; data: ParameterYjs } };
  prompts?: { [key: string]: { index: number; data: PromptYjs } };
  tests?: ArrayToYjs<NonNullable<PromptFile['tests']>>;
}

export interface ApiFileYjs extends Omit<ApiFile, 'parameters' | 'prepareExecutes' | 'tests' | 'requestParameters'> {
  parameters?: { [key: string]: { index: number; data: ParameterYjs } };
  prepareExecutes?: { [key: string]: { index: number; data: ExecuteBlockYjs } };
  tests?: ArrayToYjs<NonNullable<ApiFile['tests']>>;
  requestParameters?: ArrayToYjs<NonNullable<ApiFile['requestParameters']>>;
}

export interface FunctionFileYjs extends Omit<FunctionFile, 'parameters' | 'prepareExecutes' | 'tests'> {
  parameters?: { [key: string]: { index: number; data: ParameterYjs } };
  prepareExecutes?: { [key: string]: { index: number; data: ExecuteBlockYjs } };
  tests?: ArrayToYjs<NonNullable<FunctionFile['tests']>>;
}

export type ParameterYjs =
  | Exclude<Parameter, { type: 'select' }>
  | (Omit<SelectParameter, 'options'> & { options?: ArrayToYjs<NonNullable<SelectParameter['options']>> });
