import { AuthConfig, AuthResult } from './api-auth';
import { DataTypeSchema } from './data-type-schema';

export type HTTPMethod = 'get' | 'post' | 'put' | 'delete';

export type API = {
  url: string;
  method?: Uppercase<HTTPMethod> | Lowercase<HTTPMethod>;
  headers?: { [key: string]: string };
  auth?: AuthConfig;
};

export type InputDataTypeSchema = DataTypeSchema & {
  in?: 'path' | 'query' | 'body' | 'header' | 'cookie';
};

interface AuthParametersResult extends AuthResult {
  url: string;
  method: string;

  body?: Record<string, string>;
}

export function processParameters(
  api: API,
  inputs: { [name: string]: InputDataTypeSchema },
  input: Record<string, any>
): AuthParametersResult {
  const method = (api.method || 'GET').toUpperCase();

  const result: AuthParametersResult = {
    url: api.url,
    method,
    headers: api.headers || {},
    query: {},
    cookies: {},
    body: {},
  };

  // 处理路径参数
  let processedUrl = api.url;
  const pathParams = Object.entries(inputs).filter(([, schema]) => schema.in === 'path');
  pathParams.forEach(([key]) => {
    if (input[key] !== undefined) {
      const placeholder = `{${key}}`;
      processedUrl = processedUrl.replace(placeholder, String(input[key]));
    }
  });
  result.url = processedUrl;

  // 处理其他参数
  Object.entries(input).forEach(([key, value]) => {
    const schema = inputs[key];
    const paramIn = schema?.in;

    switch (paramIn) {
      case 'query':
        result.query![key] = value;
        break;
      case 'header':
        result.headers![key] = value;
        break;
      case 'cookie':
        result.cookies![key] = value;
        break;
      case 'body':
        result.body![key] = value;
        break;
      default:
        // 没有指定 in 的情况
        if (method === 'GET') {
          result.query![key] = value;
        } else {
          result.body![key] = value;
        }
    }
  });

  if (Object.keys(result.headers!).length === 0) delete result.headers;
  if (Object.keys(result.query!).length === 0) delete result.query;
  if (Object.keys(result.cookies!).length === 0) delete result.cookies;
  if (Object.keys(result.body!).length === 0) delete result.body;

  return result;
}

export function mergeParameters(parameters: AuthResult, authParams: AuthResult): AuthResult {
  const result: AuthResult = {};

  if (parameters.query || authParams.query) {
    result.query = { ...(parameters.query || {}), ...(authParams.query || {}) };
  }

  if (parameters.cookies || authParams.cookies) {
    result.cookies = { ...(parameters.cookies || {}), ...(authParams.cookies || {}) };
  }

  if (parameters.headers || authParams.headers) {
    result.headers = { ...(parameters.headers || {}), ...(authParams.headers || {}) };
  }

  if (Object.keys(result.headers!).length === 0) delete result.headers;
  if (Object.keys(result.query!).length === 0) delete result.query;
  if (Object.keys(result.cookies!).length === 0) delete result.cookies;

  return result;
}
