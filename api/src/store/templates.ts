import Database from '@blocklet/sdk/lib/database';
import { Worker } from 'snowflake-uuid';

const idGenerator = new Worker();

export const nextTemplateId = () => idGenerator.nextId().toString();

export type Role = 'system' | 'user' | 'assistant';

export const roles: Role[] = ['system', 'user', 'assistant'];

export interface Template {
  id: string;
  type?: 'branch' | 'image';
  mode?: 'default' | 'chat';
  name?: string;
  tags?: string[];
  icon?: string;
  description?: string;
  prompts?: { id: string; content?: string; role?: Role }[];
  branch?: {
    branches: { id: string; template?: { id: string; name?: string }; description: string }[];
  };
  parameters?: { [key: string]: Parameter };
  datasets?: { id: string; type: 'vectorStore'; vectorStore?: { id: string; name?: string } }[];
  temperature?: number;
  model?: string;
  next?: { id?: string; name?: string; outputKey?: string };
  versionNote?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export type Parameter = StringParameter | NumberParameter | SelectParameter | LanguageParameter | HoroscopeParameter;

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
