import '@blocklet/sdk/lib/error-handler';

import dotenv from 'dotenv-flow';

const logger = console;

(async () => {
  dotenv.config();

  try {
    await import('../store/migrate').then((m) => m.default());

    process.exit(0);
  } catch (error) {
    logger.error('pre-flight error', error);
    process.exit(1);
  }
})();
