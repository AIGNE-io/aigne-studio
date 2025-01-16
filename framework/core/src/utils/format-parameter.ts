import {
  API,
  AuthConfig,
  AuthResult,
  FetchRequest,
  OpenAPIParameter,
  ParametersResult,
} from '../definitions/api-parameter';
import { DataType } from '../definitions/data-type';
import logger from '../logger';
import { RunnableDefinition } from '../runnable';

export function getAuthParams(auth?: AuthConfig): AuthResult {
  if (!auth) return {};

  if (auth.type === 'custom') {
    return { headers: auth.getValue() };
  }

  const paramKey = auth.key || 'Authorization';

  const paramValue = (() => {
    let paramValue = auth.token;

    switch (auth.type) {
      case 'basic':
        paramValue = `Basic ${auth.token}`;
        break;
      case 'bearer':
        paramValue = `Bearer ${auth.token}`;
        break;
      default:
        break;
    }

    return paramValue;
  })();

  switch (auth.in) {
    case 'header':
      return { headers: { [paramKey]: paramValue } };
    case 'query':
      return { query: { [paramKey]: paramValue } };
    case 'cookie':
      return { cookies: { [paramKey]: paramValue } };
    default:
      // 默认放在 header 中
      return { headers: { [paramKey]: paramValue } };
  }
}

export function processParameters(
  api: API,
  inputs: RunnableDefinition['inputs'],
  input: Record<string, any>
): ParametersResult {
  const method = (api.method || 'GET').toUpperCase();

  const result: ParametersResult = {
    url: api.url,
    method,
    headers: {},
    query: {},
    cookies: {},
    body: {},
  };

  const filterInputs = Object.values(inputs).filter((i): i is DataType & OpenAPIParameter => !Array.isArray(i));

  // 处理路径参数
  let processedUrl = api.url;
  const pathParams = filterInputs.filter((x) => x.in === 'path');
  pathParams.forEach(({ name }) => {
    if (name && input[name] !== undefined) {
      const placeholder = `{${name}}`;
      processedUrl = processedUrl.replace(placeholder, String(input[name]));
    }
  });
  result.url = processedUrl;

  // 处理其他参数
  Object.entries(input).forEach(([key, value]) => {
    const schema = filterInputs.find((i) => i.name === key);
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
      case 'path':
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

  return result;
}

export const formatRequest = (
  api: API,
  inputs: RunnableDefinition['inputs'],
  input: Record<string, any>
): FetchRequest => {
  const inputParams = processParameters(api, inputs, input);
  logger.debug('inputParams', inputParams);
  const authParams = getAuthParams(api.auth);
  logger.debug('authParams', authParams);
  const mergedParams = mergeParameters(inputParams, authParams);
  logger.debug('mergedParams', mergedParams);

  const params = { ...inputParams, ...mergedParams };

  if (params.headers && Object.keys(params.headers).length === 0) {
    delete params.headers;
  }
  if (params.query && Object.keys(params.query).length === 0) {
    delete params.query;
  }
  if (params.cookies && Object.keys(params.cookies).length === 0) {
    delete params.cookies;
  }
  if (params.body && Object.keys(params.body).length === 0) {
    delete params.body;
  }

  logger.debug('params', params);

  return params;
};
