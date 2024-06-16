import '@blocklet/sdk/lib/error-handler';

import init from '@api/init';
import dotenv from 'dotenv-flow';

import logger from '../libs/logger';

dotenv.config();

const { name } = require('../../../package.json');

(async () => {
  try {
    await init();

    process.exit(0);
  } catch (err) {
    logger.error(`${name} pre-flight error`, err.message);
    process.exit(1);
  }
})();
