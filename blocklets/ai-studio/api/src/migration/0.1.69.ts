import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import omit from 'lodash/omit';
import { nanoid } from 'nanoid';
import { stringify } from 'yaml';

import { wallet } from '../libs/auth';
import { Config } from '../libs/env';
import logger from '../libs/logger';
import { folders } from '../store/0.1.157/folders';
import { getRepository, projects } from '../store/0.1.157/projects';
import type { Template } from '../store/0.1.157/templates';
import { templates } from '../store/0.1.157/templates';

const { name } = require('../../../package.json');

async function migrate() {
  const oldTimeMachineDir = join(Config.dataDir, 'timemachine');

  if (existsSync(oldTimeMachineDir)) {
    rmSync(oldTimeMachineDir, { force: true, recursive: true });
  }

  const defaultRepoDir = join(Config.dataDir, 'repositories', 'default');

  if (!existsSync(defaultRepoDir)) {
    // Create default project
    await projects.insert({
      _id: 'default',
      name: 'Default',
      model: '',
      createdBy: wallet.address,
      updatedBy: wallet.address,
    });

    const folderMap = Object.fromEntries(folders.getAllData().map((folder) => [folder._id!, folder.name]));
    const list = (await templates.find()) as Template[];
    if (list.length) {
      const defaultRepository = await getRepository({ projectId: 'default' });
      const did = list[0]!.createdBy;

      await defaultRepository.transact(async (tx) => {
        for (const t of list) {
          t.id ??= (t as any)._id;

          const template = migrateTemplateToPrompts(t);
          const dir = folderMap[(template as any).folderId] || undefined;
          const filepath = join(dir || '', `${template.id}.yaml`);
          const path = join(defaultRepoDir, filepath);
          mkdirSync(dirname(path), { recursive: true });
          writeFileSync(path, stringify(omit(template, '_id', 'folderId')));

          await tx.add({ filepath });
        }

        await tx.commit({ message: 'Migrate from v0.1', author: { name: did, email: did } });
      });
    }
  }
}

function migrateTemplateToPrompts(template: Template): Template {
  let res = template;

  const prompt: string | undefined = (template as any).template;
  if (template.prompts || !prompt) {
    res = omit(template, 'template');
  } else {
    res = { ...omit(template), prompts: [{ id: nanoid(), role: 'system', content: prompt }] };
  }

  if (res.branch?.branches) {
    for (const i of res.branch.branches) {
      if (!i.id) {
        i.id = nanoid();
      }
    }
  }

  return res;
}

(async () => {
  try {
    await migrate();
    logger.info('migration 0.1.69 success');
    process.exit(0);
  } catch (error) {
    logger.error(`${name} migration 0.1.69 error`, { error });
    process.exit(1);
  }
})();
