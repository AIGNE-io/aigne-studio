import path from 'path';

import { customAlphabet } from 'nanoid';

import init from '../init';
import { wallet } from '../libs/auth';
import downloadLogo from '../libs/download-logo';
import logger from '../libs/logger';
import { getRepository } from '../store/0.1.157/projects';
import Project from '../store/models/project';
import { LOGO_NAME, defaultBranch } from '../store/repository';

const { name } = require('../../../package.json');

const version = path.parse(__filename).name;

export const randomId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');

async function migrate() {
  const projects = await Project.findAll();

  await Promise.all(
    projects.map(async (project) => {
      const repo = await getRepository({ projectId: project._id });
      await repo.checkout({ ref: defaultBranch, force: true });

      try {
        if (project.dataValues.icon && project.dataValues.icon.startsWith('http')) {
          await downloadLogo(project.dataValues.icon, path.join(repo.options.root, LOGO_NAME));

          await repo.transact(async (tx) => {
            await tx.add({ filepath: LOGO_NAME });
            await tx.commit({
              message: 'Migrate to v0.1.315 for logo.png',
              author: { name: 'AI Studio', email: wallet.address },
            });
          });

          project.update({ icon: '' });
        }
      } catch (error) {
        console.error(error.message);
      }
    })
  );
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
