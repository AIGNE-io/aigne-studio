declare module 'vite-plugin-blocklet';

declare module 'express-history-api-fallback';

declare module 'express-async-errors';

declare module 'express-sse';

declare module 'express-xss-sanitizer';

declare module '@blocklet/logger' {
  function createLogger(name: string): typeof console;

  namespace createLogger {
    function getAccessLogStream(): any;
  }

  export default createLogger;
}

declare module '@abtnode/cron';

namespace Express {
  interface Request {
    user?: import('@blocklet/sdk/lib/util/login').SessionUser;
  }
}
