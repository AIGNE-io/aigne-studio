import { spawnSync } from 'child_process';
import { chmodSync, existsSync, mkdirSync, symlinkSync } from 'fs';
import { dirname, join } from 'path';

const logger = console;

const { name } = require('../../package.json');

const files = ['@blocklet/hnswlib-node', 'sqlite3'];

async function ensureBinaryFile(packageName: string) {
  logger.info(`${name} ensure ${packageName} installed`);

  try {
    await import(packageName);
    logger.info(`${name} ${packageName} already installed`);
    return;
  } catch {
    /* empty */
  }
  logger.info(`${name} try install ${packageName}`);

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
    cwd: join(appDir, `node_modules/${packageName}`),
    stdio: 'inherit',
    shell: true,
  });

  // Force rebuild if binary not available
  try {
    await import(packageName);
    logger.info(`${name} ${packageName} already installed`);
  } catch {
    spawnSync('npm', ['run', 'rebuild'], {
      cwd: join(appDir, `node_modules/${packageName}`),
      stdio: 'inherit',
      shell: true,
    });
  }
}

export default async function init() {
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    await ensureBinaryFile(file);
  }

  await import('./store/migrate').then((m) => m.default());
}
