import { Database } from '@blocklet/sdk/lib/database';

export type Role =
  | 'system'
  | 'user'
  | 'assistant'
  | 'tool'
  | 'call-prompt'
  | 'call-api'
  | 'call-function'
  | 'call-dataset'
  | 'call-macro';

export const roles: Role[] = [
  'system',
  'user',
  'assistant',
  'call-prompt',
  'call-api',
  'call-function',
  'call-dataset',
  'call-macro',
];

export interface PromptMessage {
  id: string;
  role?: Extract<Role, 'system' | 'user' | 'assistant'>;
  content?: string;
  name?: string;
  visibility?: 'hidden';
}

export interface CallPromptMessage {
  id: string;
  role: 'call-prompt';
  content?: undefined;
  output: string;
  template?: { id: string; name?: string };
  parameters?: { [key: string]: string | undefined };
  visibility?: 'hidden';
}

export interface CallMacroMessage extends Omit<CallPromptMessage, 'role'> {
  role: 'call-macro';
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

export interface ToolsMessage {
  id: string;
  function: {
    name: string;
    description: string;
    parameters?: {
      type: 'object';
      properties: { [key: string]: { type: any; description: 'string' } };
      required: string[];
    };
  };
  extraInfo: CallPromptMessage | CallAPIMessage | CallFuncMessage;
}

export type CallMessage = CallPromptMessage | CallAPIMessage | CallFuncMessage | CallDatasetMessage | CallMacroMessage;

export type EditorPromptMessage = PromptMessage | CallMessage | CallMacroMessage;

export function isPromptMessage(message: any): message is PromptMessage {
  return ['system', 'user', 'assistant', 'tool'].includes(message?.role);
}

export function isCallMacroMessage(message: any): message is CallMacroMessage {
  return message?.role === 'call-macro';
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
  tools?: ToolsMessage[];
}

export type Parameter = StringParameter | NumberParameter | SelectParameter | LanguageParameter | HoroscopeParameter;

export type ParameterYjs = Exclude<Parameter, { type: 'select' }> | SelectParameterYjs;

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

export interface SelectParameterYjs extends BaseParameter {
  type: 'select';
  value?: string;
  defaultValue?: string;
  options?: { [id: string]: { index: number; data: { id: string; label: string; value: string } } };
}

export interface LanguageParameter extends BaseParameter {
  type: 'language';
  value?: string;
  defaultValue?: string;
}

export interface HoroscopeParameter extends BaseParameter {
  type: 'horoscope';
  value?: {
    time: string;
    offset?: number;
    location: { id: number; longitude: number; latitude: number; name: string };
  };
  defaultValue?: HoroscopeParameter['value'];
}

export default class Templates extends Database {
  constructor() {
    super('templates', { timestampData: false });
  }
}

export const templates = new Templates();
