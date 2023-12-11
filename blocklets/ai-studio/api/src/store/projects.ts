import { readdirSync, rmSync, writeFileSync } from 'fs';
import path from 'path';

import { Assistant, FileTypeYjs, fileFromYjs, fileToYjs, isAssistant, isRawFile } from '@blocklet/ai-runtime/types';
import { Repository, Transaction } from '@blocklet/co-git/repository';
import Database from '@blocklet/sdk/lib/database';
import { glob } from 'glob';
import pick from 'lodash/pick';
import { nanoid } from 'nanoid';
import { Worker } from 'snowflake-uuid';
import { parse, stringify } from 'yaml';

import { wallet } from '../libs/auth';
import { Config } from '../libs/env';
import { defaultModel } from '../libs/models';
import ProjectModel from './models/projects';

const idGenerator = new Worker();

export const nextProjectId = () => idGenerator.nextId().toString();

export interface Project {
  _id?: string;
  name?: string;
  description?: string;
  model: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy: string;
  updatedBy: string;
  pinnedAt?: string | Date;
  icon?: string;
  gitType?: 'simple' | 'default';
  gitUrl?: string;
  gitAutoSync?: boolean;
  gitLastSyncedAt?: Date;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
}

export default class Projects extends Database<Project> {
  constructor() {
    super('projects');
  }
}

export const projects = new Projects();

export const projectTemplates: (Project & {
  files: (Assistant & { parent: string[] })[];
})[] = [
  {
    _id: '363299428078977024',
    name: 'blank',
    model: defaultModel,
    createdBy: wallet.address,
    updatedBy: wallet.address,
    createdAt: new Date('2023-09-30T12:23:04.603Z'),
    updatedAt: new Date('2023-09-30T12:23:04.603Z'),
    files: [
      {
        parent: ['prompts'],
        id: '',
        type: 'prompt',
        name: 'Hello World',
        prompts: [
          {
            type: 'message',
            data: {
              id: '20231208131000-LgzRpn',
              content: 'Say hello in {{language}}!',
              role: 'user',
            },
          },
        ],
        parameters: [
          {
            id: '1701840448533',
            key: 'language',
            defaultValue: 'English',
          },
        ],
        createdBy: wallet.address,
        updatedBy: wallet.address,
        createdAt: '2023-09-30T12:23:04.603Z',
        updatedAt: '2023-09-30T12:23:04.603Z',
      },
    ],
  },
];

export const defaultBranch = 'main';

export const defaultRemote = 'origin';

const repositories: { [key: string]: Promise<Repository<FileTypeYjs>> } = {};

export const repositoryRoot = (projectId: string) => path.join(Config.dataDir, 'repositories', projectId);

export const PROMPTS_FOLDER_NAME = 'prompts';

export async function getRepository({
  projectId,
  author,
}: {
  projectId: string;
  author?: NonNullable<Parameters<Repository<any>['pull']>[0]>['author'];
}) {
  repositories[projectId] ??= (async () => {
    const repository = await Repository.init<FileTypeYjs>({
      root: repositoryRoot(projectId),
      initialCommit: { message: 'init', author: author ?? { name: 'AI Studio', email: wallet.address } },
      parse: async (filepath, content) => {
        const { dir, ext } = path.parse(filepath);
        const [root] = filepath.split('/');

        if (root === PROMPTS_FOLDER_NAME && ext === '.yaml') {
          const data = fileToYjs(parse(Buffer.from(content).toString()));
          if (isAssistant(data)) {
            const parent = dir.replace(/^\.\/?/, '');
            const filename = `${data.id}.yaml`;
            return { filepath: path.join(parent, filename), key: data.id, data };
          }
        }

        return {
          filepath,
          key: nanoid(32),
          data: {
            $base64: Buffer.from(content).toString('base64'),
          },
        };
      },
      stringify: async (filepath, content) => {
        if (isAssistant(content)) {
          const data = stringify(fileFromYjs(content));
          const parent = path.dirname(filepath).replace(/^\.\/?/, '');
          const filename = `${content.name || 'Unnamed'}.${content.id}.yaml`;
          const newFilepath = path.join(parent, filename);

          return {
            filepath: newFilepath,
            data,
          };
        }

        if (isRawFile(content)) {
          const base64 = content.$base64;

          const data = typeof base64 === 'string' ? Buffer.from(base64, 'base64') : '';

          return { filepath, data };
        }

        return { filepath, data: '' };
      },
    });
    return repository;
  })();

  return repositories[projectId]!;
}

export async function syncRepository<T>({
  repository,
  ref,
  author,
}: {
  repository: Repository<T>;
  ref: string;
  author: NonNullable<Parameters<typeof repository.pull>[0]>['author'];
}) {
  const remote = (await repository.listRemotes()).find((i) => i.remote === defaultRemote);
  if (!remote) throw new Error('The remote has not been set up yet');
  const { refs: remoteRefs } = await repository.getRemoteInfo({ url: remote.url });

  await repository.transact(async () => {
    await repository.checkout({ ref, force: true });

    // NOTE: 检查远程仓库是否有对应的分支。如果远程仓库没有对应的分支，调用 pull 会报错
    if (remoteRefs?.heads?.[ref]) {
      await repository.pull({ remote: defaultRemote, ref, author });
    }
    await repository.push({ remote: defaultRemote, ref });
  });
}

const SETTINGS_FILE = '.settings.yaml';

const addSettingsToGit = async ({ tx, project }: { tx: Transaction<FileTypeYjs>; project: ProjectModel }) => {
  const repository = await getRepository({ projectId: project._id! });
  const fields = pick(project.dataValues, [
    '_id',
    'name',
    'description',
    'model',
    'createdAt',
    'updatedAt',
    'createdBy',
    'updatedBy',
    'pinnedAt',
    'icon',
    'gitType',
    'temperature',
    'topP',
    'presencePenalty',
    'frequencyPenalty',
    'maxTokens',
    'gitAutoSync',
  ]);

  const fieldsStr = stringify(fields, { aliasDuplicateObjects: false });

  writeFileSync(path.join(repository.options.root, SETTINGS_FILE), fieldsStr);
  await tx.add({ filepath: SETTINGS_FILE });
};

export const autoSyncRemoteRepoIfNeeded = async ({
  project,
  author,
}: {
  project: ProjectModel;
  author: NonNullable<NonNullable<Parameters<Repository<any>['pull']>[0]>['author']>;
}) => {
  if (project.gitUrl && project.gitAutoSync) {
    const repository = await getRepository({ projectId: project._id! });
    await syncRepository({ repository, ref: defaultBranch, author });
    await project.update({ gitLastSyncedAt: new Date() });
  }
};

export async function commitWorking({
  project,
  ref,
  branch,
  message,
  author,
}: {
  project: ProjectModel;
  ref: string;
  branch: string;
  message: string;
  author: NonNullable<NonNullable<Parameters<Repository<any>['pull']>[0]>['author']>;
}) {
  const repository = await getRepository({ projectId: project._id! });
  const working = await repository.working({ ref });
  await working.commit({
    ref,
    branch,
    message,
    author,
    beforeCommit: async ({ tx }) => {
      writeFileSync(path.join(repository.options.root, 'README.md'), getReadmeOfProject(project));
      await tx.add({ filepath: 'README.md' });

      await addSettingsToGit({ tx, project });

      // Remove unnecessary .gitkeep files
      for (const gitkeep of await glob('**/.gitkeep', { cwd: repository.options.root })) {
        if (readdirSync(path.join(repository.options.root, path.dirname(gitkeep))).length > 1) {
          rmSync(path.join(repository.options.root, gitkeep), { force: true });
          await tx.remove({ filepath: gitkeep });
        }
      }
    },
  });
}

export async function commitProjectSettingWorking({
  project,
  message = 'update settings',
  author,
}: {
  project: ProjectModel;
  message?: string;
  author: NonNullable<NonNullable<Parameters<Repository<any>['pull']>[0]>['author']>;
}) {
  const repository = await getRepository({ projectId: project._id! });
  await repository.transact(async (tx) => {
    await addSettingsToGit({ tx, project });
    await tx.commit({ message, author });
  });
}

function getReadmeOfProject(project: Project) {
  return `\
# ${project.name || 'AI Studio project'}

${project.description || ''}

## Install And Run

This is an AI project created by [AI Studio](https://store.blocklet.dev/blocklets/z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB).

To run it you can:

1. [Launch](https://launcher.arcblock.io/app/?blocklet_meta_url=https%3A%2F%2Fstore.blocklet.dev%2Fapi%2Fblocklets%2Fz8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB%2Fblocklet.json&locale=en&paymentMethod=xFdj7e5muWQyUvur&sessionId=9btigGO5FLxFwL2e) AI Studio on Blocklet Server
2. Import this project
`;
}

export function getTemplateIdFromPath(filepath: string) {
  return path.parse(filepath).name.split('.').at(-1);
}

export async function getAssistantFromRepository({
  repository,
  ref,
  working,
  assistantId,
  rejectOnEmpty,
}: {
  repository: Repository<any>;
  ref: string;
  working?: boolean;
  assistantId: string;
  rejectOnEmpty?: boolean | Error;
}): Promise<Assistant> {
  let file: Assistant;

  if (working) {
    const working = await repository.working({ ref });
    const f = working.syncedStore.files[assistantId];
    file = f && fileFromYjs(f);
  } else {
    const p = (await repository.listFiles({ ref })).find((i) => i.endsWith(`${assistantId}.yaml`));
    file = p && parse(Buffer.from((await repository.readBlob({ ref, filepath: p })).blob).toString());
  }

  if (!file || !isAssistant(file)) {
    if (rejectOnEmpty) {
      throw typeof rejectOnEmpty !== 'boolean' ? rejectOnEmpty : new Error(`no such file ${assistantId}`);
    }
  }

  return file;
}
