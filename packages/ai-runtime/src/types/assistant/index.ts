export * from './utils';
export * from './yjs';

export type FileType = Assistant | { $base64: string };

export type Assistant = PromptFile | ApiFile | FunctionFile;

export type Role = 'system' | 'user' | 'assistant';

export interface ExecuteBlock {
  id: string;
  selectType?: 'all' | 'selectByPrompt';
  selectByPrompt?: string;
  tools?: { id: string; parameters?: { [key: string]: string } }[];
  formatResultType?: 'none' | 'asContext';
  variable?: string;
}

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

export interface PromptFile {
  id: string;
  type: 'prompt';
  name?: string;
  parameters?: Parameter[];
  description?: string;
  prompts?: Prompt[];
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
  tags?: string[];
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
  model?: string;
}

export interface ApiFile {
  id: string;
  type: 'api';
  name?: string;
  description?: string;
  parameters?: Parameter[];
  prepareExecutes?: ExecuteBlock[];
  requestParameters?: { id: string; key?: string; value?: string }[];
  requestMethod?: string;
  requestUrl?: string;
  requestHeaders: { id: string; key?: string; value?: string }[];
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
  tags?: string[];
}

export interface FunctionFile {
  id: string;
  type: 'function';
  name?: string;
  description?: string;
  parameters?: Parameter[];
  prepareExecutes?: ExecuteBlock[];
  code?: string;
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
  tags?: string[];
}

export type Parameter = StringParameter | NumberParameter | SelectParameter | LanguageParameter;

export interface BaseParameter {
  id: string;
  key?: string;
  label?: string;
  placeholder?: string;
  helper?: string;
  required?: boolean;
}

export interface StringParameter extends BaseParameter {
  type?: 'string';
  value?: string;
  defaultValue?: string;
  multiline?: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface NumberParameter extends BaseParameter {
  type: 'number';
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
}

export interface SelectParameter extends BaseParameter {
  type: 'select';
  value?: string;
  defaultValue?: string;
  options?: { id: string; label: string; value: string }[];
}

export interface LanguageParameter extends BaseParameter {
  type: 'language';
  value?: string;
  defaultValue?: string;
}
