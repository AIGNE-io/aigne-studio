import { join } from 'path';
import { sep } from 'path/posix';

import { getYjsValue } from '@blocklet/co-git/yjs';
import { glob } from 'glob';

import init from '../init';
import { Config } from '../libs/env';
import logger from '../libs/logger';
import { getRepository } from '../store/0.1.157/projects';

const { name } = require('../../../package.json');

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

  const isPromptAssistant = (i: any): i is { id: string } => typeof i.id === 'string';

  for (const { projectId, ref } of workings) {
    try {
      const repo = await getRepository({ projectId });
      const working = await repo.working({ ref });

      const keys = Object.keys(working.syncedStore.tree);

      for (const key of keys) {
        const file = working.syncedStore.files[key];
        if (file && isPromptAssistant(file)) {
          working.syncedStore.tree[file.id] = working.syncedStore.tree[key];
          working.syncedStore.files[file.id] = getYjsValue(working.syncedStore.files[key])?.toJSON();

          delete working.syncedStore.tree[key];
          delete working.syncedStore.files[key];
        }
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
    logger.info(`migration ${__filename} success`);
    process.exit(0);
  } catch (error) {
    logger.error(`${name} migration ${__filename} error`, { error });
    process.exit(1);
  }
})();
