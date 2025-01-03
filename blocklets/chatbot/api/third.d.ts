declare module 'vite-plugin-blocklet';

declare module 'express-history-api-fallback';

declare module 'express-async-errors';

namespace Express {
  import type { SessionUser } from '@blocklet/sdk/lib/util/login';

  interface Request {
    user?: SessionUser;
  }
}
