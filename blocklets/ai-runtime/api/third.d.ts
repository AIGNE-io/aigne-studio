declare module 'vite-plugin-blocklet';

declare module '@blocklet/logger' {
  export default function createLogger(name: string): typeof console;
}

declare module 'express-history-api-fallback';

declare module 'express-sse';

declare module 'express-async-errors';

declare module '@abtnode/cron';

declare module 'express-xss-sanitizer';

namespace Express {
  interface Request {
    user?: {
      did: string;
      role: string | undefined;
      provider: string;
      fullName: string;
      walletOS: string;
      emailVerified: boolean;
      phoneVerified: boolean;
    };
  }
}
