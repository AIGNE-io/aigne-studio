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
  interface Request {
    user?: {
      did: string;
      role: string;
      fullName: string;
      provider: string;
      walletOS: string;
      isAdmin: boolean;
      emailVerified: boolean;
      phoneVerified: boolean;
    };
  }
}
