import { auth } from '@blocklet/sdk/lib/middlewares';
import { verify } from '@blocklet/sdk/lib/util/verify-sign';
import { NextFunction, Request, Response } from 'express';

import logger from './logger';

export const ensureAdmin = auth({ roles: ['owner', 'admin'] });

export function ensureComponentCallOrAdmin() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const sig = req.get('x-component-sig');
      if (sig) {
        const verified = verify(req.body ?? {}, sig);
        if (verified) {
          next();
        } else {
          res.status(401).json({ error: 'verify sig failed' });
        }
      } else {
        ensureAdmin(req, res, next);
      }
    } catch (error) {
      logger.error(error);
      res.status(401).json({ error: 'verify sig failed' });
    }
  };
}
