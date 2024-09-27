declare module 'vite-plugin-blocklet';

declare module 'express-history-api-fallback';

declare module 'express-async-errors';

declare module 'express-sse';

declare module 'express-xss-sanitizer';

declare module '@blocklet/logger' {
  export default function createLogger(name: string): typeof console;
}

declare module '@abtnode/cron';

namespace Express {
  import type { SessionUser } from '@blocklet/sdk/lib/util/login';

  interface Request {
    user?: SessionUser;
  }
}
