import envConfig from '@blocklet/sdk/lib/config';
import { sign } from '@blocklet/sdk/lib/util/verify-sign';
import axios from 'axios';

import { DatasetObject } from '../types';
import { getRequestConfig } from './util';

export interface User {
  did: string;
}

export const getRequest = (
  pathItem: DatasetObject,
  requestData: { [key: string]: any },
  options?: { user?: User; params?: { [key: string]: any }; data?: { [key: string]: any } }
) => {
  const requestConfig = getRequestConfig(pathItem, requestData, {
    params: options?.params || {},
    data: options?.data || {},
  });
  const { headers, body, ...config } = requestConfig;
  let did = '';

  if (options?.user) {
    did = options?.user?.did || '';
  }

  return axios({
    ...config,
    baseURL: envConfig.env.appUrl,
    headers: {
      ...(headers || {}),
      'x-component-sig': sign(body || {}),
      'x-component-did': process.env.BLOCKLET_COMPONENT_DID,
      'x-user-did': did,
    },
  });
};
