import { wallet } from '@api/libs/auth';
import { appRegister, appStatus } from '@blocklet/ai-kit/api/call';
import { isAxiosError } from 'axios';
import { NextFunction, Request, Response, Router } from 'express';

import { ensureAdmin } from '../libs/security';

const router = Router();

router.get(
  '/status',
  ensureAdmin,
  catchAxiosError(async (_, res) => {
    const result = await appStatus();

    res.json(result);
  })
);

router.post(
  '/register',
  ensureAdmin,
  catchAxiosError(async (_, res) => {
    const result = await appRegister({ publicKey: wallet.publicKey });

    res.json(result);
  })
);

export default router;

function catchAxiosError(handler: (req: Request, res: Response, next: NextFunction) => any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        res.status(error.response.status).json(error.response.data);
        return;
      }
      throw error;
    }
  };
}
