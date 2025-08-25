import { OrderedMap } from './utils';

export type TypeRef = Pick<TypeDefineTypes, 'type' | 'defaultValue'> | { type: { $ref: string }; defaultValue?: any };

export interface TypeDefine {
  id: string;
  description?: string;
  type: TypeDefineTypes;
}

export type TypeDefineTypes =
  | TypeDefineString
  | TypeDefineNumber
  | TypeDefineBoolean
  | TypeDefineObject
  | TypeDefineArray;

export interface TypeDefineBase {
  id: string;
  description?: string;
  required?: boolean;
}

export interface TypeDefineString extends TypeDefineBase {
  type: 'string';
  defaultValue?: string;
  multiline?: boolean;
}

export interface TypeDefineNumber extends TypeDefineBase {
  type: 'number';
  defaultValue?: number;
}

export interface TypeDefineBoolean extends TypeDefineBase {
  type: 'boolean';
  defaultValue?: boolean;
}

export interface TypeDefineObject extends TypeDefineBase {
  type: 'object';
  defaultValue?: object;
  properties?: OrderedMap<TypeDefine>;
}

export interface TypeDefineArray extends TypeDefineBase {
  type: 'array';
  defaultValue?: object[];
  item?: TypeDefine;
}
