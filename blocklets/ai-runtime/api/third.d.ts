declare module 'vite-plugin-blocklet';

declare module '@blocklet/logger';

declare module 'express-history-api-fallback';

declare module 'express-sse';

declare module 'express-async-errors';

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
    };
  }
}
