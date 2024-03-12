import { getComponentWebEndpoint } from '@blocklet/sdk/lib/component';
import { sign } from '@blocklet/sdk/lib/util/verify-sign';
import axios from 'axios';

import { DatasetObject } from '../types';
import { getRequestConfig } from './util';

export interface User {
  did: string;
  role: string;
  fullName: string;
  provider: string;
  walletOS: string;
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
  const { headers, ...config } = requestConfig;
  let did = '';

  if (options?.user) {
    did = options?.user?.did || '';
  }

  config.baseURL = pathItem?.name ? getComponentWebEndpoint(pathItem?.name) : '';

  return axios({
    ...config,
    headers: {
      ...(headers || {}),
      'x-component-sig': sign(config.data || {}),
      'x-component-did': process.env.BLOCKLET_COMPONENT_DID,
      'x-user-did': did,
    },
  });
};
