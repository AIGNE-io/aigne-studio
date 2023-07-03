import { existsSync, rmSync } from 'fs';
import { join } from 'path';

import { omit } from 'lodash';
import { nanoid } from 'nanoid';
import { stringify } from 'yaml';

import env from '../libs/env';
import logger from '../libs/logger';
import { folders } from '../store/folders';
import { Template, templates } from '../store/templates';
import Templates from '../store/time-machine';

const { name } = require('../../../package.json');

async function migrate() {
  const oldTimeMachineDir = join(env.dataDir, 'timemachine');

  if (existsSync(oldTimeMachineDir)) {
    rmSync(oldTimeMachineDir, { force: true, recursive: true });
  }

  if (!existsSync(Templates.root.dir)) {
    const folderMap = Object.fromEntries(folders.getAllData().map((folder) => [folder._id!, folder.name]));
    const list = (await templates.find()) as Template[];
    if (list.length) {
      const did = list[0]!.createdBy;

      await Templates.root.run(async (tx) => {
        for (const t of list) {
          t.id ??= (t as any)._id;

          const template = migrateTemplateToPrompts(t);
          const dir = folderMap[(template as any).folderId] || undefined;
          await tx.write({ path: dir || '', data: stringify(omit(template, '_id', 'folderId')) });
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
    logger.info('migration 0.1.66 success');
    process.exit(0);
  } catch (err) {
    logger.error(`${name} migration 0.1.66 error`, err);
    process.exit(1);
  }
})();
