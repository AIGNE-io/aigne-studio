import { readdir, rm, writeFile } from 'fs/promises';
import path, { relative } from 'path';

import {
  Assistant,
  FileTypeYjs,
  fileFromYjs,
  fileToYjs,
  isAssistant,
  isRawFile,
  isVariableFile,
} from '@blocklet/ai-runtime/types';
import { Repository, Transaction } from '@blocklet/co-git/repository';
import { SpaceClient, SyncFolderPushCommand, SyncFolderPushCommandOutput } from '@did-space/client';
import { pathExists } from 'fs-extra';
import { glob } from 'glob';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import { nanoid } from 'nanoid';
import { parse, stringify } from 'yaml';

import { authClient, wallet } from '../libs/auth';
import downloadLogo from '../libs/download-logo';
import { Config } from '../libs/env';
import logger from '../libs/logger';
import Project from './models/project';

export const defaultBranch = 'main';

export const defaultRemote = 'origin';

const repositories: { [key: string]: Promise<Repository<FileTypeYjs>> } = {};

export const repositoryRoot = (projectId: string) => path.join(Config.dataDir, 'repositories', projectId);
export const repositoryCooperativeRoot = (projectId: string) =>
  path.join(Config.dataDir, 'repositories', `${projectId}.cooperative`);

export const PROMPTS_FOLDER_NAME = 'prompts';
export const TESTS_FOLDER_NAME = 'tests';
export const LOGO_FILENAME = 'logo.png';

export async function clearRepository(projectId: string) {
  const repo = await getRepository({ projectId });
  await repo.destroy();
  delete repositories[projectId];
}

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
      parse: async (filepath, content, { ref }) => {
        const { dir, ext } = path.parse(filepath);
        const [root] = filepath.split('/');

        if (root === PROMPTS_FOLDER_NAME && ext === '.yaml') {
          const testFilepath = filepath.replace(new RegExp(`^${PROMPTS_FOLDER_NAME}`), TESTS_FOLDER_NAME);
          const assistant = parse(Buffer.from(content).toString());

          try {
            const testFile = (
              await repository.readBlob({
                filepath: testFilepath,
                ref,
              })
            )?.blob;
            const test = parse(Buffer.from(testFile).toString());
            if (test) {
              assistant.tests = test.tests;
            }
          } catch (error) {
            logger.error('read testFile blob failed error', { error });
          }

          const data = fileToYjs(assistant);

          if (isAssistant(data)) {
            const parent = dir.replace(/^\.\/?/, '');
            const filename = `${data.id}.yaml`;
            return { filepath: path.join(parent, filename), key: data.id, data };
          }
        }

        if (ext === '.config') {
          const variable = parse(Buffer.from(content).toString());

          return {
            filepath,
            key: nanoid(32),
            data: variable,
          };
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
        if (filepath.startsWith(TESTS_FOLDER_NAME)) return null;

        if (isAssistant(content)) {
          const fileContent = fileFromYjs(content);
          const { tests, ...otherData } = fileContent as Assistant;
          const newTest = {
            id: otherData.id,
            tests,
          };
          const testsData = stringify(newTest);
          const assistantData = stringify(otherData);
          const parent = path.dirname(filepath).replace(/^\.\/?/, '');
          const pathParts = parent.split(path.sep);
          pathParts[0] = TESTS_FOLDER_NAME;
          const testPath = pathParts.join(path.sep);
          const filename = `${content.name || 'Unnamed'}.${content.id}.yaml`;
          const assistantDataFilepath = path.join(parent, filename);
          const testsDataFilepath = path.join(testPath, filename);

          return [
            {
              filepath: assistantDataFilepath,
              data: assistantData ?? '',
            },
            {
              filepath: testsDataFilepath,
              data: testsData ?? '',
            },
          ];
        }

        if (isRawFile(content)) {
          const base64 = content.$base64;
          const data = typeof base64 === 'string' ? Buffer.from(base64, 'base64') : '';
          return [{ filepath, data }];
        }

        if (isVariableFile(content)) {
          const { type, variables } = content;
          return [{ filepath, data: stringify({ type, variables }) }];
        }

        return [{ filepath, data: '' }];
      },
    });
    return repository;
  })();

  return repositories[projectId]!;
}

export async function syncToDidSpace({ project, userId }: { project: Project; userId: string }) {
  const { user } = await authClient.getUser(userId);
  const endpoint = user?.didSpace?.endpoint;

  if (isEmpty(endpoint)) {
    return;
  }

  const spaceClient = new SpaceClient({
    endpoint,
    wallet,
  });

  const repositoryPath = repositoryRoot(project._id);
  const repositoryCooperativePath = repositoryCooperativeRoot(project._id);
  const outputs: (SyncFolderPushCommandOutput | null)[] = await Promise.all(
    [repositoryPath, repositoryCooperativePath].map(async (path) => {
      if (await pathExists(path)) {
        return spaceClient.send(
          new SyncFolderPushCommand({
            source: path,
            target: relative(Config.dataDir, path),
            metadata: { ...project.toJSON() },
          })
        );
      }
      return null;
    })
  );

  // 如果有错误则抛出
  const errorOutput = outputs.filter(Boolean).find((output) => output?.statusCode !== 200);
  if (errorOutput) {
    throw new Error(errorOutput.statusMessage);
  }

  await project.update({ didSpaceLastSyncedAt: new Date() });
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

export const SETTINGS_FILE = '.settings.yaml';

const addSettingsToGit = async ({
  tx,
  project,
  icon,
}: {
  tx: Transaction<FileTypeYjs>;
  project: Project;
  icon?: string;
}) => {
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
    'gitType',
    'temperature',
    'topP',
    'presencePenalty',
    'frequencyPenalty',
    'maxTokens',
    'gitAutoSync',
  ]);

  const fieldsStr = stringify(fields, { aliasDuplicateObjects: false });

  await writeFile(path.join(repository.options.root, SETTINGS_FILE), fieldsStr);
  await tx.add({ filepath: SETTINGS_FILE });

  // 新上传的图片
  try {
    if (icon && icon.startsWith('http') && !icon.includes('/api/projects')) {
      await downloadLogo(icon, path.join(repository.options.root, LOGO_FILENAME));
    } else {
      const file = (await repository.readBlob({ ref: defaultBranch!, filepath: LOGO_FILENAME })).blob;
      await writeFile(path.join(repository.options.root, LOGO_FILENAME), file);
    }
    await tx.add({ filepath: LOGO_FILENAME });
  } catch (error) {
    logger.error('failed to save project icon', { error });
  }
};

export const autoSyncIfNeeded = async ({
  project,
  author,
  userId,
}: {
  project: Project;
  author: NonNullable<NonNullable<Parameters<Repository<any>['pull']>[0]>['author']>;
  userId: string;
}) => {
  if (project.gitUrl && project.gitAutoSync) {
    const repository = await getRepository({ projectId: project._id! });
    await syncRepository({ repository, ref: project.gitDefaultBranch, author });
    await project.update({ gitLastSyncedAt: new Date() });
  }

  if (project.didSpaceAutoSync) {
    await syncToDidSpace({ project, userId });
  }
};

export async function commitWorking({
  project,
  ref,
  branch,
  message,
  author,
  beforeCommit,
}: {
  project: Project;
  ref: string;
  branch: string;
  message: string;
  author: NonNullable<NonNullable<Parameters<Repository<any>['pull']>[0]>['author']>;
  beforeCommit?: (tx: Transaction<FileTypeYjs>) => Promise<void>;
}) {
  const repository = await getRepository({ projectId: project._id! });
  const working = await repository.working({ ref });

  await working.commit({
    ref,
    branch,
    message,
    author,
    beforeCommit: async ({ tx }) => {
      await writeFile(path.join(repository.options.root, 'README.md'), getReadmeOfProject(project));
      await tx.add({ filepath: 'README.md' });

      if (beforeCommit && typeof beforeCommit === 'function') {
        await beforeCommit(tx);
      }

      await addSettingsToGit({ tx, project });

      // Remove unnecessary .gitkeep files
      for (const gitkeep of await glob('**/.gitkeep', { cwd: repository.options.root })) {
        if ((await readdir(path.join(repository.options.root, path.dirname(gitkeep)))).length > 1) {
          await rm(path.join(repository.options.root, gitkeep), { force: true });
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
  icon,
}: {
  project: Project;
  message?: string;
  author: NonNullable<NonNullable<Parameters<Repository<any>['pull']>[0]>['author']>;
  icon?: string;
}) {
  const repository = await getRepository({ projectId: project._id! });
  await repository.transact(async (tx) => {
    await tx.checkout({ ref: project.gitDefaultBranch, force: true });
    await addSettingsToGit({ tx, project, icon });
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

export function getAssistantIdFromPath(filepath: string) {
  return path.parse(filepath).name.split('.').at(-1);
}

export async function getAssistantsOfRepository({ projectId, ref }: { projectId: string; ref: string }) {
  const repository = await getRepository({ projectId });
  return repository
    .listFiles({ ref })
    .then((files) =>
      Promise.all(
        files
          .filter((i) => i.startsWith(`${PROMPTS_FOLDER_NAME}/`) && i.endsWith('.yaml'))
          .map((filepath) => {
            const paths = filepath.split('/').filter(Boolean);
            return repository
              .readBlob({ ref, filepath })
              .then(({ blob }) => ({ ...parse(Buffer.from(blob).toString()), parent: paths.slice(0, -1) }));
          })
      )
    )
    .then((files) => files.filter((i): i is Assistant => isAssistant(i)));
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
  rejectOnEmpty: true | Error;
}): Promise<Assistant>;
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
  rejectOnEmpty?: false;
}): Promise<Assistant | undefined>;
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
}): Promise<Assistant | undefined> {
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
      throw typeof rejectOnEmpty !== 'boolean'
        ? rejectOnEmpty
        : new Error(`no such assistant ${JSON.stringify({ ref, assistantId, working })}`);
    }
  }

  return file;
}
