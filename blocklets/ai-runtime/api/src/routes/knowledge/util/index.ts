import config from '@blocklet/sdk/lib/config';
import SSE from 'express-sse';
import { joinURL, withQuery } from 'ufo';

export const sse = new SSE();

export const getResourceAvatarPath = (did: string) => {
  return withQuery(joinURL(config.env.appUrl, '/.well-known/service/blocklet/logo-bundle', did), {
    v: '1.0.1',
    imageFilter: 'resize',
    w: 100,
  });
};
