import fs, { existsSync } from 'fs';
import { dirname, join } from 'path';

import dayjs from 'dayjs';
import * as git from 'isomorphic-git';

import { Template } from '../store/templates';
import env from './env';

const dir = join(env.dataDir, 'time-machine/root');

const templatePath = (templateId: string) => join('templates', `${templateId}.json`);

const defaultBranch = 'main';

async function init() {
  if (!existsSync(dir)) {
    await git.init({
      fs,
      dir,
      defaultBranch,
    });
  }
}

async function writeTemplate(template: Template): Promise<string> {
  await init();

  const filepath = templatePath(template._id);

  fs.mkdirSync(dirname(filepath), { recursive: true });

  fs.writeFileSync(filepath, JSON.stringify(template, null, 2));

  const updatedAt = dayjs(template.updatedAt);

  await git.add({ fs, dir, filepath });
  return git.commit({
    fs,
    dir,
    message: template.versionNote || updatedAt.toISOString(),
    author: {
      name: template.updatedBy,
      email: template.updatedBy,
      timestamp: updatedAt.unix(),
      timezoneOffset: -updatedAt.utcOffset(),
    },
  });
}

async function getTemplateCommits(templateId: string) {
  await init();

  const filepath = templatePath(templateId);

  return git.log({
    fs,
    dir,
    ref: defaultBranch,
    filepath,
    force: true,
  });
}

async function getTemplate(oid: string, templateId: string): Promise<Template> {
  await init();

  const filepath = templatePath(templateId);

  return JSON.parse(
    Buffer.from(
      (
        await git.readBlob({
          fs,
          dir,
          oid,
          filepath,
        })
      ).blob
    ).toString('utf-8')
  );
}

export default {
  dir,
  init,
  writeTemplate,
  getTemplateCommits,
  getTemplate,
};
