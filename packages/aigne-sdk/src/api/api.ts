/// <reference path="../blocklet.d.ts" />

import { createAxios } from '@blocklet/js-sdk';

import { AIGNE_RUNTIME_COMPONENT_DID, AIGNE_STUDIO_COMPONENT_DID } from '../constants';

export const API_TIMEOUT = 120 * 1000;

export const aigneRuntimeApi = createAxios({ timeout: API_TIMEOUT }, { componentDid: AIGNE_RUNTIME_COMPONENT_DID });

export function getMountPoint(did: string) {
  const mountPoint = globalThis.blocklet?.componentMountPoints.find((i) => i.did === did)?.mountPoint;
  if (!mountPoint) throw new Error(`No such component: ${did}`);
  return mountPoint;
}

export const aigneStudioApi = createAxios({ timeout: API_TIMEOUT }, { componentDid: AIGNE_STUDIO_COMPONENT_DID });
