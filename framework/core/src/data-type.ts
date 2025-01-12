import { OmitPropsFromUnion } from './utils/omit';
import { OrderedRecord } from './utils/ordered-map';

export type DataType = DataTypeString | DataTypeNumber | DataTypeBoolean | DataTypeObject | DataTypeArray;

export interface DataTypeBase {
  id: string;
  name?: string;
  description?: string;
  required?: boolean;
}

export interface DataTypeString extends DataTypeBase {
  type: 'string';
  defaultValue?: string;
  multiline?: boolean;
}

export interface DataTypeNumber extends DataTypeBase {
  type: 'number';
  defaultValue?: number;
}

export interface DataTypeBoolean extends DataTypeBase {
  type: 'boolean';
  defaultValue?: boolean;
}

export interface DataTypeObject extends DataTypeBase {
  type: 'object';
  defaultValue?: object;
  properties?: OrderedRecord<DataType>;
}

export interface DataTypeArray extends DataTypeBase {
  type: 'array';
  defaultValue?: object[];
  items?: OmitPropsFromUnion<DataType, 'id'>;
}

type SchemaTypeInner<T extends Record<string, OmitPropsFromUnion<DataType, 'id' | 'name'>>> = {
  [K in keyof T]: T[K]['type'] extends 'string'
    ? string
    : T[K]['type'] extends 'number'
      ? number
      : T[K]['type'] extends 'boolean'
        ? boolean
        : T[K]['type'] extends 'object'
          ? object
          : T[K]['type'] extends 'array'
            ? object[]
            : never;
};

export type SchemaType<T extends Record<string, OmitPropsFromUnion<DataType, 'id' | 'name'>>> = {
  [K in keyof T]: T[K]['required'] extends true ? SchemaTypeInner<T>[K] : SchemaTypeInner<T>[K] | undefined;
};
