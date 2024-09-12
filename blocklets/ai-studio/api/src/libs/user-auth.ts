import { Request, Response } from 'express';

class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

function checkAuth(req: Request, res: Response): (userId?: string) => void {
  return (userId?: string) => {
    try {
      const { user } = req;

      if (!user) {
        throw new AuthError('Unauthorized, user information does not exist', 401);
      }

      if (!['admin', 'owner'].includes(user.role)) {
        throw new AuthError('Insufficient authority', 403);
      }

      if (userId && userId !== user.did) {
        throw new AuthError('User ID does not match', 403);
      }
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

export default checkAuth;
