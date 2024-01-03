import path, { join } from 'path';
import { sep } from 'path/posix';

import { glob } from 'glob';

import init from '../init';
import { Config } from '../libs/env';
import logger from '../libs/logger';
import { getRepository } from '../store/repository';

const { name } = require('../../../package.json');

const version = path.parse(__filename).name;

async function migrate() {
  const workings = (await glob(join(Config.dataDir, 'repositories', '*.cooperative/*')))
    .map((p) => {
      const [repo, ref] = p.split(sep).slice(-2);
      if (repo?.endsWith('.cooperative')) {
        const projectId = repo.replace('.cooperative', '');
        if (projectId && ref) {
          return { projectId, ref };
        }
      }
      return undefined;
    })
    .filter((i): i is NonNullable<typeof i> => !!i);

  for (const { projectId, ref } of workings) {
    try {
      const repo = await getRepository({ projectId });
      const working = await repo.working({ ref });

      const keys = Object.keys(working.syncedStore.tree);

      for (const key of keys) {
        const filepath = working.syncedStore.tree[key];
        if (filepath) working.syncedStore.tree[key] = path.join('prompts', filepath);
      }
      working.save({ flush: true });
    } catch (error) {
      logger.error('migrate working failed', { error });
    }
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
