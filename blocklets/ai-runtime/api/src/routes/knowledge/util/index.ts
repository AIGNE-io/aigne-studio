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

// eslint-disable-next-line no-promise-executor-return
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const retry = (promiseCreator: () => Promise<unknown>, time = 0, interval = 0) => {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line consistent-return
    const recursion = async () => {
      try {
        const res = await promiseCreator();
        resolve(res);
      } catch (error) {
        // eslint-disable-next-line no-param-reassign
        if (time-- <= 0) return reject(error);
        setTimeout(recursion, interval);
      }
    };
    recursion();
  });
};
