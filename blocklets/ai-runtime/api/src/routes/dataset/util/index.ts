import config from '@blocklet/sdk/lib/config';
import SSE from 'express-sse';
import { joinURL } from 'ufo';

export const sse = new SSE();

export const getResourceAvatarPath = (did: string) => {
  return joinURL(
    config.env.appUrl,
    '/.well-known/server/admin/blocklet/logo-bundle',
    config.env.appId,
    `${did}?v=1.0.1`
  );
};
