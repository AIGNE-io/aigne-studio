export * from './utils';
export * from './yjs';

export { default as Mustache } from './mustache/mustache';
export * from './mustache/directive';

export enum OnTaskCompletion {
  EXIT = 'EXIT',
}

export type FileType = Assistant | { $base64: string };

export type Assistant = PromptAssistant | ImageAssistant | ApiAssistant | FunctionAssistant;

export type Role = 'system' | 'user' | 'assistant';

export type ExecuteBlockRole = Role | 'none';

export type Tool = {
  id: string;
  parameters?: { [key: string]: string };
  functionName?: string;
  onEnd?: OnTaskCompletion;
};

type ExecuteBlockCommon = {
  id: string;
  role?: ExecuteBlockRole;
  selectByPrompt?: string;
  tools?: Tool[];
  formatResultType?: 'none' | 'asHistory';
  variable?: string;
};

export type ExecuteBlockSelectAll = ExecuteBlockCommon & { selectType: 'all' };

type ModelConfiguration = {
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
  model?: string;
};

export type ExecuteBlockSelectByPrompt = ExecuteBlockCommon & {
  selectType: 'selectByPrompt';
  executeModel?: ModelConfiguration;
};

export type ExecuteBlock = ExecuteBlockSelectAll | ExecuteBlockSelectByPrompt;

export type PromptMessage = {
  id: string;
  role: Role;
  content?: string;
  name?: string;
};

export type Prompt =
  | {
      type: 'message';
      data: PromptMessage;
      visibility?: 'hidden';
    }
  | {
      type: 'executeBlock';
      data: ExecuteBlock;
      visibility?: 'hidden';
    };

export interface AssistantBase {
  id: string;
  name?: string;
  parameters?: Parameter[];
  tags?: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  tests?: {
    id: string;
    parameters: { [key: string]: any };
    output?: string;
    error?: { message: string };
    createdBy: string;
  }[];
  formatResultType?: 'none';
}

export interface PromptAssistant extends AssistantBase {
  type: 'prompt';
  prompts?: Prompt[];
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
  model?: string;
}

export interface ImageAssistant extends AssistantBase {
  type: 'image';
  prepareExecutes?: ExecuteBlock[];
  prompt?: string;
  model?: string;
  n?: number;
  quality?: string;
  style?: string;
  size?: string;
  responseFormat?: string;
}

export interface ApiAssistant extends AssistantBase {
  type: 'api';
  prepareExecutes?: ExecuteBlock[];
  requestParameters?: { id: string; key?: string; value?: string }[];
  requestMethod?: string;
  requestUrl?: string;
  requestHeaders: { id: string; key?: string; value?: string }[];
}

export interface FunctionAssistant extends AssistantBase {
  type: 'function';
  prepareExecutes?: ExecuteBlock[];
  code?: string;
}

export type Parameter = StringParameter | NumberParameter | SelectParameter | LanguageParameter;

export interface ParameterBase {
  id: string;
  key?: string;
  label?: string;
  placeholder?: string;
  helper?: string;
  required?: boolean;
  from?: 'editor';
}

export interface StringParameter extends ParameterBase {
  type?: 'string';
  value?: string;
  defaultValue?: string;
  multiline?: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface NumberParameter extends ParameterBase {
  type: 'number';
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
}

export interface SelectParameter extends ParameterBase {
  type: 'select';
  value?: string;
  defaultValue?: string;
  options?: { id: string; label: string; value: string }[];
}

export interface LanguageParameter extends ParameterBase {
  type: 'language';
  value?: string;
  defaultValue?: string;
}
