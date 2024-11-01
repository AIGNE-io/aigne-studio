declare module 'vite-plugin-blocklet';

declare module '@blocklet/logger' {
  function createLogger(name: string): typeof console;

  namespace createLogger {
    function getAccessLogStream(): any;
  }

  export default createLogger;
}

declare module 'express-history-api-fallback';

declare module 'express-sse';

declare module 'express-async-errors';

declare module '@abtnode/cron';

declare module 'express-xss-sanitizer';

namespace Express {
  import type { SessionUser } from '@blocklet/sdk/lib/util/login';

  interface Request {
    user?: SessionUser;
  }
}
