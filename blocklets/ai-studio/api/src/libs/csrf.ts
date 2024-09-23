import { csrf as csrfMiddleware } from '@blocklet/sdk/lib/middlewares/csrf';

const SKIP_CSRF_API: { method?: string; path: string | RegExp }[] = [{ path: '/api/resources/export' }];

export function csrf() {
  return csrfMiddleware({
    verifyToken(req, res) {
      const skip = SKIP_CSRF_API.some(
        (i) =>
          (!i.method || i.method.toLowerCase() === req.method.toLowerCase()) &&
          (i.path instanceof RegExp ? i.path.test(req.path) : i.path === req.path)
      );

      return !skip ? res.locals.verifyToken(req) : undefined;
    },
  });
}
