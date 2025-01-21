import { xss as xssMiddleware } from '@blocklet/xss';
import type { NextFunction, Request, Response } from 'express';

const SKIP_XSS_API: { method?: string; path: string | RegExp }[] = [{ path: /^\/api\/ai/ }];

export function xss() {
  const middleware = xssMiddleware();

  return (req: Request, res: Response, next: NextFunction) => {
    const skip = SKIP_XSS_API.some(
      (i) =>
        (!i.method || i.method.toLowerCase() === req.method.toLowerCase()) &&
        (i.path instanceof RegExp ? i.path.test(req.path) : i.path === req.path)
    );

    if (skip) {
      next();
    } else {
      middleware(req, res, next);
    }
  };
}
