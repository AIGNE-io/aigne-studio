import '@blocklet/sdk/lib/error-handler';

import { spawnSync } from 'child_process';
import { chmodSync, existsSync, mkdirSync, symlinkSync } from 'fs';
import { dirname, join } from 'path';

import dotenv from 'dotenv-flow';

import { authClient, customRoles } from '../libs/auth';
import logger from '../libs/logger';

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

const hnswlib = '@blocklet/hnswlib-node';

async function ensureHNSWLIBBinaryFile() {
  logger.info(`${name} ensure ${hnswlib}  installed`);

  try {
    await import(hnswlib);
    logger.info(`${name} ${hnswlib} already installed`);
    return;
  } catch {
    /* empty */
  }
  logger.info(`${name} try install ${hnswlib}`);

  const appDir = process.env.BLOCKLET_APP_DIR!;

  // link `node-pre-gyp` to .bin for download or build hnswlib-node
  try {
    const srcPath = join(appDir, 'node_modules/@mapbox/node-pre-gyp/bin/node-pre-gyp');
    const binPath = join(appDir, 'node_modules/.bin/node-pre-gyp');
    if (!existsSync(binPath) && existsSync(srcPath)) {
      mkdirSync(dirname(binPath), { recursive: true });
      symlinkSync(srcPath, binPath);
      chmodSync(binPath, '755');
    }
  } catch (error) {
    logger.warn(error.message);
  }

  spawnSync('npm', ['run', 'install'], {
    cwd: join(appDir, `node_modules/${hnswlib}`),
    stdio: 'inherit',
    shell: true,
  });

  // Force rebuild if binary not available
  try {
    await import(hnswlib);
    logger.info(`${name} ${hnswlib} already installed`);
  } catch {
    spawnSync('npm', ['run', 'rebuild'], {
      cwd: join(appDir, `node_modules/${hnswlib}`),
      stdio: 'inherit',
      shell: true,
    });
  }
}

(async () => {
  try {
    await ensureRolesCreated();
    await ensureHNSWLIBBinaryFile();
    await import('../store/migrate').then((m) => m.default());

    process.exit(0);
  } catch (err) {
    logger.error(`${name} pre-start error`, err.message);
    process.exit(1);
  }
})();
