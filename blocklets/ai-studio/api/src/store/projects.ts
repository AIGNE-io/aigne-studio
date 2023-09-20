import path from 'path';

import { Repository } from '@blocklet/co-git';
import Database from '@blocklet/sdk/lib/database';
import { parse, stringify } from 'yaml';

import env from '../libs/env';
import { Template } from './templates';

export interface Project {
  _id?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy: string;
  updatedBy: string;
}

export default class Projects extends Database<Project> {
  constructor() {
    super('projects');
  }
}

export const projects = new Projects();

export const defaultBranch = 'main';

const repositories: { [key: string]: Promise<Repository<Template | { $base64: string }>> } = {};

export async function getRepository({ projectId }: { projectId: string }) {
  repositories[projectId] ??= (async () => {
    const repository = await Repository.init<Template | { $base64: string }>({
      root: path.join(env.dataDir, 'repositories', projectId),
      parse: async (filepath, content) => {
        if (path.extname(filepath) === '.yaml') {
          return parse(Buffer.from(content).toString());
        }

        // FIXME: type checkout not working for next line
        return {
          $base64: Buffer.from(content).toString('base64'),
        };
      },
      stringify: async (filepath, content) => {
        if (path.extname(filepath) === '.yaml') {
          return stringify(content);
        }

        const base64 = (content as any).$base64;

        return typeof base64 === 'string' ? Buffer.from(base64, 'base64') : '';
      },
    });
    return repository;
  })();

  return repositories[projectId]!;
}

export async function getTemplatesFromRepository({ projectId, ref }: { projectId: string; ref: string }) {
  const repository = await getRepository({ projectId });
  const files = await repository.listFiles({ ref }).then((files) => files.filter((i) => i.endsWith('.yaml')));
  return Promise.all(
    files.map((filepath) =>
      repository.readBlob({ ref, filepath }).then(({ blob }) => parse(Buffer.from(blob).toString()) as Template)
    )
  );
}
