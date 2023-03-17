import { getChildWebEndpoint, getComponentWebEndpoint, getParentWebEndpoint } from '@blocklet/sdk/lib/component';
import axios, { AxiosRequestConfig } from 'axios';
import { Response } from 'express';
import stringify from 'json-stable-stringify';

import { wallet } from './auth';

export async function proxyToComponent(
  {
    name,
    url,
    method,
    data,
    params,
  }: {
    name: string;
    url: string;
    method?: RequestMethod;
    data?: any;
    params?: any;
  },
  res: Response
) {
  try {
    const response = await callComponent({
      name,
      url,
      method,
      data,
      params,
      responseType: 'stream',
    });
    response.data.pipe(res);
  } catch (error) {
    if (error.response) {
      const { response } = error;
      res.status(response.status);
      response.data.pipe(res);
      return;
    }

    res.status(500).json({ message: error.message });
  }
}

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface CallComponentOptions extends AxiosRequestConfig {
  name?: string;
  url: string;
  method?: RequestMethod;
  data?: any;
  params?: any;
}

export async function callComponent({ name, url, method = 'GET', data, params, ...options }: CallComponentOptions) {
  return axios({
    ...options,
    baseURL: (name && (getComponentWebEndpoint(name) || getChildWebEndpoint(name))) || getParentWebEndpoint(),
    url,
    method,
    data,
    params,
    headers: { 'x-component-sig': wallet.sign(stringify(data || {})) },
  });
}
