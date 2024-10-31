import { Method } from 'axios';
import Cookie from 'js-cookie';

import { DatasetObject } from '../types';
import { call } from '../util/call';
import { getRequestConfig } from './util';

export interface User {
  did: string;
}

export const callBlockletApi = (
  pathItem: DatasetObject,
  data: { [key: string]: any },
  options?: { user?: User; params?: { [key: string]: any }; data?: { [key: string]: any } }
) => {
  const requestConfig = getRequestConfig(pathItem, data, {
    params: options?.params || {},
    data: options?.data || {},
  });
  const { headers, body, method, url, ...config } = requestConfig;
  const did = options?.user?.did || '';

  if (!pathItem.name) throw new Error('Blocklet name is required to call blocklet api');

  return call({
    ...config,
    method: method as Method,
    name: pathItem.name,
    path: url,
    headers: {
      ...(headers || {}),
      'x-component-did': pathItem.did || process.env.BLOCKLET_COMPONENT_DID,
      'x-user-did': did,
      'x-csrf-token': Cookie.get('x-csrf-token'),
    },
  });
};
