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

export type ParameterType = 'number' | 'string';

export type Parameter = {
  type?: ParameterType;
  value?: any;
  [key: string]: any;
};

export default class Templates extends Database {
  constructor() {
    super('templates');
  }
}

export const templates = new Templates();
