import { Database } from '@blocklet/sdk';

export interface Template {
  _id: string;
  name: string;
  icon?: string;
  description?: string;
  template: string;
  parameters: { [key: string]: Parameter };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export type Parameter = StringParameter | NumberParameter | SelectParameter;

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
  multiline?: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface NumberParameter extends BaseParameter {
  type: 'number';
  value?: number;
  min?: number;
  max?: number;
}

export interface SelectParameter extends BaseParameter {
  type: 'select';
  value?: string;
  options?: { id: string; label: string; value: string }[];
}

export default class Templates extends Database {
  constructor() {
    super('templates');
  }
}

export const templates = new Templates();
