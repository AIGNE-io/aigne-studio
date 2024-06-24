import '@blocklet/sdk/lib/error-handler';

import dotenv from 'dotenv-flow';

import { authClient, customRoles } from '../libs/auth';

(async () => {
  const logger = console;

  dotenv.config();

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

  try {
    await ensureRolesCreated();

    await import('../store/migrate').then((m) => m.default());

    process.exit(0);
  } catch (err) {
    logger.error('pre-flight error', err);
    process.exit(1);
  }
})();
