import { SIG_VERSION } from '@blocklet/constant';
import { call as originalCall } from '@blocklet/sdk/lib/component';
import { verify } from '@blocklet/sdk/lib/util/verify-sign';
import { Request } from 'express';
import isNil from 'lodash/isNil';
import semVer from 'semver';
import { parseURL } from 'ufo';

export const call: typeof originalCall = (options: any) => {
  return originalCall({
    ...(options as any),
    params: Object.fromEntries(
      Object.entries(options.params ?? {}).map(([key, value]) => [key, isNil(value) ? '' : String(value)])
    ),
  });
};

const legacyFn = (req: Request) => {
  const data = req?.body ?? {};
  const params = req?.query ?? {};
  return { data, params };
};

const latestFn = (req: Request) => {
  const now = Math.floor(Date.now() / 1000);
  const iat = Number(req.get('x-component-sig-iat'));
  const exp = Number(req.get('x-component-sig-exp'));
  if (Number.isNaN(iat) || Number.isNaN(exp)) {
    throw new Error('invalid sig');
  }
  if (exp < now) {
    throw new Error('expired sig');
  }
  const data: {
    body?: any;
    query?: any;
    method?: string;
    url?: string;
    iat: number;
    exp: number;
  } = {
    iat,
    exp,
    body: req.body ?? {},
    query: req.query ?? {},
    method: req.method.toLowerCase(),
    url: parseURL(req.originalUrl).pathname,
  };
  return data;
};

export const verifySig = (req: Request) => {
  const sig = req.get('x-component-sig');
  const sigVersion = req.get('x-component-sig-version');
  if (!sig) {
    throw new Error('verify sig failed');
  }
  const getData = semVer.gt(semVer.coerce(sigVersion)!, semVer.coerce(SIG_VERSION!.V0)!) ? latestFn : legacyFn;
  const data = getData(req);
  const verified = verify(data, sig);
  if (!verified) {
    throw new Error('verify sig failed');
  }
  return true;
};
