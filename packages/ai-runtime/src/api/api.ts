/// <reference path="../blocklet.d.ts" />
import { createAxios } from '@blocklet/js-sdk';

const AI_STUDIO_DID = 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

export const AIStudioBaseUrl =
  globalThis.blocklet?.componentMountPoints.find((i) => i.did === AI_STUDIO_DID)?.mountPoint || '/';

export const API_TIMEOUT = 120 * 1000;

export const aiStudioApi = createAxios(
  {
    timeout: API_TIMEOUT,
  },
  {
    componentDid: AI_STUDIO_DID,
  }
);

export const getErrorMessage = (error: any) =>
  error.response?.data?.error?.message || error.response?.data?.message || error.message || error;
