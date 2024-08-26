import { xss as xssMiddleware } from '@blocklet/xss';
import { NextFunction, Request, Response } from 'express';

const SKIP_XSS_API: { method?: string; path: string | RegExp }[] = [
  { method: 'POST', path: '/api/ai/call' },
  { method: 'POST', path: '/api/cron-histories' },
  { method: 'POST', path: '/api/memories' },
  { method: 'PUT', path: '/api/memories' },
  { path: /^\/api\/datasets\/\s+\/search/ },
  { path: /^\/api\/datasets\/\s+\/documents/ },
];

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
