import { auth } from '@blocklet/sdk/lib/middlewares';
import { getVerifyData, verify } from '@blocklet/sdk/lib/util/verify-sign';
import { NextFunction, Request, Response } from 'express';

import { NoPermissionError } from './error';
import logger from './logger';

export const ADMIN_ROLES = ['owner', 'admin'];

export const ensureAdmin = auth({ roles: ADMIN_ROLES });

export async function ensureAgentAdmin(req: Request, getOwnerId: () => Promise<string | string[]>) {
  if (req.user?.role) {
    if (ADMIN_ROLES.includes(req.user.role)) return true;

    const ownerIds = [await getOwnerId()].flat();
    if (ownerIds.every((i) => i === req.user!.did)) return true;
  }

  throw new NoPermissionError('Forbidden');
}

export function ensureComponentCallOr(fallback: (req: Request, res: Response, next: NextFunction) => any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const sig = req.get('x-component-sig');
      if (sig) {
        const { data, sig } = getVerifyData(req);
        const verified = verify(data, sig);
        if (verified) {
          next();
        } else {
          res.status(401).json({ error: 'verify sig failed' });
        }
      } else {
        fallback(req, res, next);
      }
    } catch (error) {
      logger.error('validate signature of calling error', { error });
      res.status(401).json({ error: 'verify sig failed' });
    }
  };
}

export function ensureComponentCallOrAdmin() {
  return ensureComponentCallOr(ensureAdmin);
}

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
