import type { UserInfo } from '@abtnode/client';
import { NextFunction, Request, Response } from 'express';
import pick from 'lodash/pick';
import { LRUCache } from 'lru-cache';

import { authClient } from './auth';
import logger from './logger';

const cache = new LRUCache<string, Pick<UserInfo, 'did' | 'fullName' | 'avatar'>>({
  // 缓存大小: 300 个 user
  maxSize: 300,
  sizeCalculation: () => {
    return 1;
  },
  // 一周 (ms)
  ttl: 1000 * 60 * 60 * 24 * 7,
});

const fetchUsers = async (dids: string[]) => {
  try {
    const { users } = await authClient.getUsers({ dids });
    return users.map((item) => pick(item, ['did', 'fullName', 'avatar']));
  } catch (error) {
    logger.error('fetch users error', { error });
    return [];
  }
};

export const getUsers = async (dids: string[]) => {
  if (!dids?.length) {
    return {};
  }
  dids = [...new Set(dids)];
  const mapped = dids.map((did) => [did, cache.get(did)] as const);
  const misses = mapped.filter((item) => !item[1]).map((item) => item[0]);

  const map = Object.fromEntries(mapped);

  if (misses.length) {
    const fetched = await fetchUsers(misses);
    fetched.forEach((item) => {
      cache.set(item.did, item);
      map[item.did] = item;
    });
  }
  return map;
};

export const getUser = async (did: string) => {
  return (await getUsers([did]))[did];
};

export const userAuth = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.did) {
      res.status(401).json({
        code: 'forbidden',
        error: 'The current user information is not obtained, and access to data is prohibited.',
      });
      return;
    }

    req.user.isAdmin = ['owner', 'admin'].includes(req.user?.role!);
    next();
  };
};
