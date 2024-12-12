import { Request, Response } from 'express';

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

      if (['admin', 'owner', 'promptsEditor'].includes(user.role!)) {
        return;
      }

      if (data?.userId && data.userId === user.did) {
        return;
      }

      throw new AuthError('The access is prohibited because the permission is insufficient', 403);
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }

      throw error;
    }
  };
}

export default checkUserAuth;
