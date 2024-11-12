import { DatasetObject } from '../types';
import { callComponentWithToken } from '../util/call';
import { getRequestConfig } from './util';

export interface User {
  did: string;
}

export const callBlockletApi = (
  pathItem: DatasetObject,
  data: { [key: string]: any },
  options: {
    loginToken?: string;
    params?: { [key: string]: any };
    data?: { [key: string]: any };
  }
) => {
  const requestConfig = getRequestConfig(pathItem, data, {
    params: options?.params || {},
    data: options?.data || {},
  });
  const { headers, method, url, params } = requestConfig;

  if (!pathItem.name) throw new Error('Blocklet name is required to call blocklet api');

  return callComponentWithToken({
    name: pathItem.name,
    method,
    path: url,
    headers,
    loginToken: options.loginToken,
    query: params,
    body: requestConfig.data,
  });
};
