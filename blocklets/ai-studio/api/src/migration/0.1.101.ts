import { join } from 'path';
import { sep } from 'path/posix';

import { glob } from 'glob';

import env from '../libs/env';
import logger from '../libs/logger';
import { getRepository, isTemplate } from '../store/projects';

const { name } = require('../../../package.json');

async function migrate() {
  const workings = (await glob(join(env.dataDir, 'repositories', '*.cooperative/*')))
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
      for (const file of Object.values(working.syncedStore.files)) {
        if (file && isTemplate(file) && file.parameters) {
          for (const parameter of Object.values(file.parameters)) {
            if (parameter.type === 'select' && Array.isArray(parameter.options)) {
              parameter.options = Object.fromEntries(
                parameter.options.map((option, index) => [
                  option.id,
                  { index, data: JSON.parse(JSON.stringify(option)) },
                ])
              );
            }
          }
        }
      }
      working.save({ flush: true });
    } catch (error) {
      logger.error('migrate working failed', error);
    }
  }
}

(async () => {
  try {
    await migrate();
    logger.info('migration 0.1.101 success');
    process.exit(0);
  } catch (err) {
    logger.error(`${name} migration 0.1.101 error`, err);
    process.exit(1);
  }
})();
