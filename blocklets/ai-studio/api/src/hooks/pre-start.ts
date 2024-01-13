import '@blocklet/sdk/lib/error-handler';

import dotenv from 'dotenv-flow';

import init from '../init';
import { authClient, customRoles } from '../libs/auth';

const logger = console;

dotenv.config();

const { name } = require('../../../package.json');

async function ensureRolesCreated() {
  const { roles } = await authClient.getRoles();
  await Promise.all(
    customRoles.map(async (role) => {
      if (roles.some((item) => item.name === role.name)) {
        logger.info(`The role "${role.name}" already exists.`);
      } else {
        await authClient.createRole(role);
        logger.info(`The role "${role.name}" has been created successfully.`);
      }
    })
  );
}

(async () => {
  try {
    await ensureRolesCreated();

    await init();

    process.exit(0);
  } catch (err) {
    logger.error(`${name} pre-start error`, err.message);
    process.exit(1);
  }
})();
