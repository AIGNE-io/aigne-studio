/// <reference path="../blocklet.d.ts" />

import axios from 'axios';

const AI_STUDIO_DID = 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

export const AIStudioBaseUrl =
  globalThis.blocklet?.componentMountPoints.find((i) => i.did === AI_STUDIO_DID)?.mountPoint || '/';

export const API_TIMEOUT = 120 * 1000;

export const aiStudioApi = axios.create({
  baseURL: AIStudioBaseUrl,
  timeout: API_TIMEOUT,
});

export const getErrorMessage = (error: any) =>
  error.response?.data?.error?.message || error.response?.data?.message || error.message || error;
