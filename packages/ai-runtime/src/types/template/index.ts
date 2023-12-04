export type Role = 'system' | 'user' | 'assistant' | 'call-prompt' | 'call-api' | 'call-function' | 'call-dataset';

export const AllRoles: Role[] = [
  'system',
  'user',
  'assistant',
  'call-prompt',
  'call-api',
  'call-function',
  'call-dataset',
];

export interface PromptMessage {
  id: string;
  role?: Extract<Role, 'system' | 'user' | 'assistant'>;
  content?: string;
  visibility?: 'hidden';
}

export interface CallPromptMessage {
  id: string;
  role: 'call-prompt';
  content?: undefined;
  output: string;
  template?: { id: string; name?: string };
  parameters?: {
    [key: string]: string | undefined;
  };
  visibility?: 'hidden';
}

export interface CallAPIMessage {
  id: string;
  role: 'call-api';
  content?: undefined;
  method: string;
  url: string;
  body?: string;
  output: string;
  visibility?: 'hidden';
}

export interface CallFuncMessage {
  id: string;
  role: 'call-function';
  content?: undefined;
  code?: string;
  output: string;
  visibility?: 'hidden';
}

export interface CallDatasetMessage {
  id: string;
  role: 'call-dataset';
  content?: undefined;
  output: string;
  type?: 'vectorStore';
  parameters?: { query?: string; [key: string]: string | undefined };
  vectorStore?: { id: string; name?: string };
  visibility?: 'hidden';
}

export type CallMessage = CallPromptMessage | CallAPIMessage | CallFuncMessage | CallDatasetMessage;

export type EditorPromptMessage = PromptMessage | CallMessage;

export function isPromptMessage(message: any): message is PromptMessage {
  return ['system', 'user', 'assistant'].includes(message?.role);
}

export function isCallPromptMessage(message: any): message is CallPromptMessage {
  return message?.role === 'call-prompt';
}

export function isCallAPIMessage(message: any): message is CallAPIMessage {
  return message?.role === 'call-api';
}

export function isCallFuncMessage(message: any): message is CallFuncMessage {
  return message?.role === 'call-function';
}

export function isCallDatasetMessage(message: any): message is CallDatasetMessage {
  return message?.role === 'call-dataset';
}

export interface Template {
  id: string;
  type?: 'branch' | 'image';
  mode?: 'default' | 'chat';
  name?: string;
  tags?: string[];
  icon?: string;
  description?: string;
  prompts?: EditorPromptMessage[];
  branch?: {
    branches: { id: string; template?: { id: string; name?: string }; description: string }[];
  };
  parameters?: { [key: string]: Parameter };
  datasets?: { id: string; type: 'vectorStore'; vectorStore?: { id: string; name?: string } }[];
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
  model?: string;
  next?: { id?: string; name?: string; outputKey?: string };
  versionNote?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  public?: boolean;
  tests?: {
    id: string;
    parameters: { [key: string]: any };
    output?: string;
    error?: { message: string };
    createdBy: string;
  }[];
}

export type Parameter = StringParameter | NumberParameter | SelectParameter | LanguageParameter;

export type ParameterType = NonNullable<Parameter['type']>;

export interface BaseParameter {
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
