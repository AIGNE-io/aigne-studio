import { getComponentWebEndpoint } from '@blocklet/sdk/lib/component';
import envConfig from '@blocklet/sdk/lib/config';
import { sign } from '@blocklet/sdk/lib/util/verify-sign';
import axios from 'axios';
import Cookie from 'js-cookie';

import { DatasetObject } from '../types';
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
  const { headers, body, ...config } = requestConfig;
  const did = options?.user?.did || '';

  return axios({
    ...config,
    baseURL: pathItem.name ? getComponentWebEndpoint(pathItem.name) : envConfig.env.appUrl,
    headers: {
      ...(headers || {}),
      'x-component-sig': sign(body || {}),
      'x-component-did': pathItem.did || process.env.BLOCKLET_COMPONENT_DID,
      'x-user-did': did,
      'x-csrf-token': Cookie.get('x-csrf-token'),
    },
  });
};
