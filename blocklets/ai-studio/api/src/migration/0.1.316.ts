import { mkdtemp, rename, rm, stat } from 'fs/promises';
import path, { join } from 'path';

import { customAlphabet } from 'nanoid';

import init from '../init';
import { wallet } from '../libs/auth';
import downloadLogo from '../libs/download-logo';
import { Config } from '../libs/env';
import logger from '../libs/logger';
import { getRepository } from '../store/0.1.157/projects';
import Project from '../store/models/project';
import { LOGO_FILENAME, defaultBranch } from '../store/repository';

const { name } = require('../../../package.json');

const version = '0.1.316';

export const randomId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');

async function migrate() {
  const projects = await Project.findAll();

  const tmp = await mkdtemp(join(Config.dataDir, 'icons-'));

  try {
    await Promise.all(
      projects.map(async (project) => {
        const repo = await getRepository({ projectId: project.id });
        const { icon } = project;

        try {
          if (icon && icon.startsWith('http')) {
            const tmpFile = join(tmp, project.id);
            await downloadLogo(icon, tmpFile);
            if (!(await stat(tmpFile)).size) {
              throw new Error('Invalid icon file downloaded');
            }

            await repo.transact(async (tx) => {
              await tx.checkout({ ref: defaultBranch, force: true });

              await rename(tmpFile, path.join(repo.options.root, LOGO_FILENAME));

              await tx.add({ filepath: LOGO_FILENAME });
              await tx.commit({
                message: 'Migrate to v0.1.316 for logo.png',
                author: { name: 'AI Studio', email: wallet.address },
              });
            });

            await project.update({ icon: '' });
          }
        } catch (error) {
          console.error(error.message);
        }
      })
    );
  } finally {
    await rm(tmp, { force: true, recursive: true });
  }
}

(async () => {
  try {
    await init();

    await migrate();
    logger.info(`migration ${version} success`);
    process.exit(0);
  } catch (error) {
    logger.error(`${name} migration ${version} error`, { error });
    process.exit(1);
  }
})();
