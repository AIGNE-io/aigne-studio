import { join } from 'path';
import { sep } from 'path/posix';

import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { glob } from 'glob';

import { Config } from '../libs/env';
import logger from '../libs/logger';
import type { TemplateYjs } from '../store/0.1.157/projects';
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
    .filter(isNonNullable);

  const isOldTemplateYjs = (file: any): file is TemplateYjs =>
    !!file &&
    typeof file.id === 'string' &&
    file.parameters &&
    typeof file.parameters === 'object' &&
    !Array.isArray(file.parameters);

  for (const { projectId, ref } of workings) {
    try {
      const repo = await getRepository({ projectId });
      const working = await repo.working({ ref });
      for (const file of Object.values(working.syncedStore.files)) {
        if (file && isOldTemplateYjs(file) && file.parameters) {
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
      logger.error('migrate working failed', { error });
    }
  }
}

(async () => {
  try {
    await migrate();
    logger.info('migration 0.1.101 success');
    process.exit(0);
  } catch (error) {
    logger.error(`${name} migration 0.1.101 error`, { error });
    process.exit(1);
  }
})();
