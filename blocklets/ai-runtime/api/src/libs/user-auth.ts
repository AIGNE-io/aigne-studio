import { Request, Response } from 'express';

import isSameAddr from './is-same-address';
import logger from './logger';

class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

type CheckAuthType = {
  userId?: string;
};

function checkUserAuth(req: Request, res: Response): (data?: CheckAuthType) => void {
  return (data?: CheckAuthType) => {
    try {
      const { user } = req;

      if (!user) {
        throw new AuthError('Unauthorized, user information does not exist', 401);
      }

      logger.debug('user auth', { userId: user.did, role: user.role, data });

      if (['admin', 'owner', 'promptsEditor'].includes(user.role!)) {
        return;
      }

      if (data?.userId && isSameAddr(data.userId, user.did)) {
        return;
      }

      throw new AuthError('The access is prohibited because the permission is insufficient', 403);
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ message: error.message, error: error.message });
      } else {
        res.status(500).json({ message: error.message, error: error.message });
      }

      throw error;
    }
  };
}

export default checkUserAuth;
