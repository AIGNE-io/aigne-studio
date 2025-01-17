import { DataType } from './data-type';
import { DataTypeSchema } from './data-type-schema';

export interface BaseAuthConfig {
  type: 'bearer' | 'basic';
  token: string;
  in?: 'header' | 'query' | 'cookie';
  key?: string; // HTTP 头部名称，如果你不知道是什么，可以将其保留为 Authorization 或设置为自定义值
}

export interface CustomAuthConfig {
  type: 'custom';
  getValue: () => Promise<AuthResult> | AuthResult;
}

export type AuthConfig = BaseAuthConfig | CustomAuthConfig;

export type AuthType = AuthConfig['type'];

export type AuthResult = Pick<FetchRequest, 'headers' | 'query' | 'cookies'>;

type HTTPMethodLowercase = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options';

export type HTTPMethod = Uppercase<HTTPMethodLowercase> | Lowercase<HTTPMethodLowercase>;

export type ParameterLocation = 'path' | 'query' | 'body' | 'header' | 'cookie';

export type OpenAPIDataType = DataType & { in?: ParameterLocation };

export type OpenAPIDataTypeSchema = DataTypeSchema & { in?: ParameterLocation };

export type FetchRequest = {
  url: string;

  method: HTTPMethod;

  query?: Record<string, string | number | boolean>;

  headers?: Record<string, string>;

  cookies?: Record<string, string>;

  body?: Record<string, any>;
};
