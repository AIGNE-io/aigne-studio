/// <reference path="../blocklet.d.ts" />

import { createAxios } from '@blocklet/js-sdk';

import { AIGNE_RUNTIME_COMPONENT_DID, AIGNE_STUDIO_COMPONENT_DID } from '../constants';

export const API_TIMEOUT = 120 * 1000;

export const aigneRuntimeApi = createAxios({
  timeout: API_TIMEOUT,
});

aigneRuntimeApi.interceptors.request.use((config) => {
  const mountPoint = globalThis.blocklet?.componentMountPoints.find(
    (i) => i.did === AIGNE_RUNTIME_COMPONENT_DID
  )?.mountPoint;
  if (!mountPoint) throw new Error('No such aigne-runtime component');
  config.baseURL = mountPoint;
  return config;
});

export const aigneStudioApi = createAxios({
  timeout: API_TIMEOUT,
});

aigneStudioApi.interceptors.request.use((config) => {
  const mountPoint = globalThis.blocklet?.componentMountPoints.find(
    (i) => i.did === AIGNE_STUDIO_COMPONENT_DID
  )?.mountPoint;
  if (!mountPoint) throw new Error('No such aigne-studio component');
  config.baseURL = mountPoint;
  return config;
});
