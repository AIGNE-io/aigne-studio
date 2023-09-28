/* eslint-disable no-await-in-loop */
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { $text2lexical } from '@blocklet/prompt-editor/utils';

import env from '../libs/env';
import logger from '../libs/logger';
import { getRepository, isTemplate } from '../store/projects';

const { name } = require('../../../package.json');

const findTemplatePath = () => {
  const list: { fullPath: string; projectId: string }[] = [];
  const defaultRepoDir = join(env.dataDir, 'repositories');

  if (existsSync(defaultRepoDir)) {
    const files = readdirSync(defaultRepoDir) || [];

    for (const file of files) {
      const fullPath = join(defaultRepoDir, file);
      if (file.endsWith('.cooperative') && statSync(fullPath).isDirectory()) {
        list.push({ fullPath, projectId: file.replace('.cooperative', '') });
      }
    }
  }
  return list;
};

async function migrate() {
  const files = await findTemplatePath();

  for (const { projectId } of files) {
    const repository = await getRepository({ projectId });
    const refs = await repository.listBranches();

    for (const ref of refs) {
      const working = await repository.working({ ref });

      for (const file of Object.values(working.syncedStore.files)) {
        if (file && isTemplate(file)) {
          // @ts-ignore
          for (const prompt of Object.values(file?.prompts)) {
            prompt.data.contentLexicalJson ??= await $text2lexical(prompt.data.content, prompt.data.role);
          }
        }
      }

      await working.save({ flush: true });
    }
  }
}

(async () => {
  try {
    await migrate();
    logger.info('migration 0.1.87 success');
    process.exit(0);
  } catch (err) {
    logger.error(`${name} migration 0.1.87 error`, err);
    process.exit(1);
  }
})();
