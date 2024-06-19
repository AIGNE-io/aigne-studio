import '@blocklet/sdk/lib/error-handler';

import dotenv from 'dotenv-flow';

import logger from '../libs/logger';

(async () => {
  dotenv.config();

  try {
    await import('../store/migrate').then((m) => m.default());

    process.exit(0);
  } catch (err) {
    logger.error('pre-flight error', err);
    process.exit(1);
  }
})();
