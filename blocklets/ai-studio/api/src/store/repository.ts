import { copyFile, mkdir, readdir, rm, writeFile } from 'fs/promises';
import path, { dirname, extname, join, relative } from 'path';

import { EVENTS } from '@api/event';
import { broadcast } from '@api/libs/ws';
import {
  Assistant,
  AssistantYjs,
  ConfigFile,
  FileType,
  FileTypeYjs,
  ProjectSettings,
  Variable,
  Variables,
  fileFromYjs,
  fileToYjs,
  isAssistant,
  projectSettingsSchema,
  variableFromYjs,
  variableToYjs,
} from '@blocklet/ai-runtime/types';
import { Repository, RepositoryOptions, Working } from '@blocklet/co-git/repository';
import { SpaceClient, SyncFolderPushCommand, SyncFolderPushCommandOutput } from '@did-space/client';
import { pathExists } from 'fs-extra';
import { glob } from 'glob';
import { Errors } from 'isomorphic-git';
import isEmpty from 'lodash/isEmpty';
import { nanoid } from 'nanoid';
import { parseAuth, parseFilename, parseURL } from 'ufo';
import { parse, stringify } from 'yaml';

import { authClient, wallet } from '../libs/auth';
import downloadImage, { md5file } from '../libs/download-logo';
import { Config } from '../libs/env';
import logger from '../libs/logger';
import Project from './models/project';

export const CONFIG_FOLDER = 'config';
export const WORKING_FOLDER = 'working';

export const OLD_VARIABLE_KEY = 'variable';
export const OLD_VARIABLE_FILENAME = `${OLD_VARIABLE_KEY}.yaml`;
export const VARIABLE_FILE_PATH = join(CONFIG_FOLDER, 'variable.yaml');

export const OLD_CONFIG_FILE_KEY = 'config';
export const OLD_CONFIG_FILENAME = `${OLD_CONFIG_FILE_KEY}.yaml`;
export const CONFIG_FILE_PATH = join(CONFIG_FOLDER, 'config.yaml');

export const CRON_CONFIG_FILE_PATH = join(CONFIG_FOLDER, 'cron.yaml');

export const defaultBranch = 'main';

export const defaultRemote = 'origin';

export const repositoryRoot = (projectId: string) => path.join(Config.dataDir, 'repositories', projectId);
export const repositoryCooperativeRoot = (projectId: string) =>
  path.join(Config.dataDir, 'repositories', `${projectId}.cooperative`);

export const PROMPTS_FOLDER_NAME = 'prompts';
export const TESTS_FOLDER_NAME = 'tests';
export const LOGO_FILENAME = 'logo.png';
export const OLD_PROJECT_FILE_PATH = '.settings.yaml';
export const PROJECT_FILE_PATH = 'project.yaml';

export const ASSETS_DIR = 'assets';

const RESET_FILES_BEFORE_COMMIT = ['prompts', 'tests'];

export class ProjectRepo extends Repository<FileTypeYjs> {
  private static cache: { [key: string]: Promise<ProjectRepo> } = {};

  static async load({
    projectId,
    author,
  }: {
    projectId: string;
    author?: NonNullable<Parameters<Repository<any>['pull']>[0]>['author'];
  }): Promise<ProjectRepo> {
    this.cache[projectId] ??= (async () => {
      const repo = await Repository.init<FileTypeYjs>({
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
                await repo.readBlob({
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

            if (!assistant) {
              return null;
            }

            const data = fileToYjs(assistant);

            if (isAssistant(data)) {
              const parent = dir.replace(/^\.\/?/, '');
              const filename = `${data.id}.yaml`;
              return { filepath: path.join(parent, filename), key: data.id, data };
            }
          }

          if (filepath === VARIABLE_FILE_PATH) {
            const variables: Variable[] = parse(Buffer.from(content).toString())?.variables;
            return { filepath, key: VARIABLE_FILE_PATH, data: { variables: variables.map(variableToYjs) } };
          }

          if ([CONFIG_FILE_PATH, CRON_CONFIG_FILE_PATH, PROJECT_FILE_PATH, OLD_PROJECT_FILE_PATH].includes(filepath)) {
            const config = parse(Buffer.from(content).toString());
            return { filepath, key: filepath, data: config };
          }

          return null;
        },
        stringify: async (filepath, content) => {
          const [root] = filepath.split('/');
          if (!content) return null;

          if (filepath.startsWith(TESTS_FOLDER_NAME)) return null;

          if (root === PROMPTS_FOLDER_NAME && isAssistant(content)) {
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

          if (filepath === VARIABLE_FILE_PATH) {
            return [{ filepath, data: stringify({ variables: (content as any)?.variables?.map(variableFromYjs) }) }];
          }

          if ([CONFIG_FILE_PATH, PROJECT_FILE_PATH, CRON_CONFIG_FILE_PATH].includes(filepath)) {
            return [{ filepath, data: stringify(content) }];
          }

          return null;
        },
      });

      return new ProjectRepo(projectId, repo.options);
    })();

    return this.cache[projectId]!;
  }

  constructor(
    public readonly projectId: string,
    options: RepositoryOptions<FileTypeYjs>
  ) {
    super(options);
  }

  override async destroy() {
    super.destroy();
    delete ProjectRepo.cache[this.projectId];
  }

  override async working({ ref }: { ref: string }): Promise<Working<FileTypeYjs>> {
    const working = await super.working({ ref });

    // 兼容旧版数据，重命名 file key
    if (working.syncedStore.files[OLD_CONFIG_FILE_KEY]) {
      renameSyncedStoreFileKey(working, OLD_CONFIG_FILE_KEY, CONFIG_FILE_PATH);
    }
    if (working.syncedStore.files[OLD_VARIABLE_KEY]) {
      renameSyncedStoreFileKey(working, OLD_VARIABLE_KEY, VARIABLE_FILE_PATH);
    }

    // 兼容旧版数据，初始化 project.yaml
    if (!working.syncedStore.files[PROJECT_FILE_PATH]) {
      const project = await Project.findByPk(this.projectId, {
        rejectOnEmpty: new Error(`No such project ${this.projectId}`),
      });

      working.syncedStore.files[PROJECT_FILE_PATH] = await projectSettingsSchema.validateAsync(project.dataValues);
      working.syncedStore.tree[PROJECT_FILE_PATH] = PROJECT_FILE_PATH;

      if (working.syncedStore.files[OLD_PROJECT_FILE_PATH]) delete working.syncedStore.files[OLD_PROJECT_FILE_PATH];
      if (working.syncedStore.tree[OLD_PROJECT_FILE_PATH]) delete working.syncedStore.tree[OLD_PROJECT_FILE_PATH];
    }

    // 兼容旧版数据，从 main 分支复制 logo
    const logoPath = path.join(working.workingDir, LOGO_FILENAME);
    if (!(await pathExists(logoPath))) {
      const file = await this.readBlob({ ref: defaultBranch, filepath: LOGO_FILENAME })
        .then(({ blob }) => blob)
        .catch((error) => {
          logger.warn('Failed to copy logo from default branch to working dir', { error });
        });
      if (file) {
        await mkdir(dirname(logoPath), { recursive: true });
        await writeFile(logoPath, file);
      }
    }

    // ensure config files
    const ensureConfigFileExists = (filename: string, defaultValue: any = {}) => {
      working.transact(() => {
        if (!working.syncedStore.files[filename]) {
          working.syncedStore.files[filename] = defaultValue;
          working.syncedStore.tree[filename] = filename;
        }
      });
    };
    ensureConfigFileExists(CONFIG_FILE_PATH);
    ensureConfigFileExists(CRON_CONFIG_FILE_PATH);
    ensureConfigFileExists(VARIABLE_FILE_PATH, { variables: [] });

    return working;
  }

  async commitWorking({
    ref,
    branch,
    message,
    author,
    icon,
    skipCommitIfNoChanges,
  }: {
    ref: string;
    branch: string;
    message: string;
    author: NonNullable<NonNullable<Parameters<Repository<any>['pull']>[0]>['author']>;
    icon?: string;
    skipCommitIfNoChanges?: boolean;
  }) {
    const project = await Project.findByPk(this.projectId, {
      rejectOnEmpty: new Error(`No such project ${this.projectId}`),
    });
    const working = await this.working({ ref });

    const result = await working.commit({
      ref,
      branch,
      message,
      author,
      skipCommitIfNoChanges,
      beforeTransact: async ({ tx }) => {
        // reset files before commit
        for (const file of [...RESET_FILES_BEFORE_COMMIT, OLD_PROJECT_FILE_PATH]) {
          await rm(path.join(working.workingDir, file), { recursive: true, force: true });
          await tx.remove({ dir: working.workingDir, filepath: file });
        }
      },
      beforeCommit: async ({ tx }) => {
        // TODO: 支持前端编辑 README 文件
        const setting = working.syncedStore.files[PROJECT_FILE_PATH] as ProjectSettings | undefined;
        const readme = getReadmeOfProject({ name: setting?.name || '', description: setting?.description || '' });
        await writeFile(path.join(working.workingDir, 'README.md'), readme);

        // Download or copy icon file
        if (icon) {
          const iconPath = path.join(working.workingDir, LOGO_FILENAME);
          if (await pathExists(icon)) {
            await copyFile(icon, iconPath);
          } else if (/^https?:\/\//.test(icon)) {
            await downloadImage(icon, iconPath);
          }
        }

        // Remove unnecessary assets
        const assetsDir = join(working.workingDir, ASSETS_DIR);
        if (await pathExists(assetsDir)) {
          const json = JSON.stringify(working.get('files').toJSON());
          const assets = await readdir(assetsDir);
          for (const filename of assets) {
            if (!json.includes(filename)) {
              await rm(join(assetsDir, filename), { force: true });
              await tx.remove({ dir: working.workingDir, filepath: join(ASSETS_DIR, filename) });
            }
          }
        }

        // Remove unnecessary .gitkeep files
        for (const gitkeep of await glob('**/.gitkeep', { cwd: working.workingDir })) {
          if ((await readdir(path.join(working.workingDir, path.dirname(gitkeep)))).length > 1) {
            await rm(path.join(working.workingDir, gitkeep), { force: true });
          }
        }

        await tx.add({ dir: working.workingDir, filepath: '.' });

        if (skipCommitIfNoChanges) {
          const changes = await tx.repo.statusMatrix({ dir: working.workingDir });
          const hasChange = !changes.every((i) => i[1] === 1 && i[2] === 1 && i[3] === 1);
          if (hasChange) {
            const setting = working.syncedStore.files[PROJECT_FILE_PATH] as ProjectSettings;
            if (!setting) throw new Error('Missing required project.yaml');
            setting.updatedAt = new Date().toISOString();
            await writeFile(path.join(working.workingDir, PROJECT_FILE_PATH), stringify(setting));
          }
        }
      },
    });

    project.changed('updatedAt', true);
    await project.update({ updatedAt: new Date() });

    return result;
  }

  async uploadAsset({ type, ref, source }: { type: 'logo' | 'asset'; ref: string; source: string }) {
    const originalFilename = parseFilename(source, { strict: true });
    const ext = originalFilename && extname(originalFilename);
    const working = await this.working({ ref });
    const tmpFilename = join(working.options.root, 'tmp', nanoid());
    try {
      await mkdir(dirname(tmpFilename), { recursive: true });
      await downloadImage(source, tmpFilename);
      const hash = await md5file(tmpFilename);
      const filename = type === 'logo' ? LOGO_FILENAME : `${hash}${ext}`;
      const filePath =
        type === 'logo' ? join(working.workingDir, filename) : join(working.workingDir, ASSETS_DIR, filename);
      await mkdir(dirname(filePath), { recursive: true });
      await copyFile(tmpFilename, filePath);
      return { filename, hash };
    } finally {
      await rm(tmpFilename, { force: true, recursive: true });
    }
  }

  async readAndParseFile<T>({ ref, filepath }: { ref?: string; filepath: string }): Promise<T> {
    const file = Buffer.from((await this.readBlob({ ref: ref || defaultBranch, filepath })).blob).toString();
    return parse(file);
  }
}

export async function getRepository({
  projectId,
  author,
}: {
  projectId: string;
  author?: NonNullable<Parameters<Repository<any>['pull']>[0]>['author'];
}) {
  return ProjectRepo.load({ projectId, author });
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

export const autoSyncIfNeeded = async ({
  project,
  author,
  userId,
  wait = true,
}: {
  project: Project;
  author: NonNullable<NonNullable<Parameters<Repository<any>['pull']>[0]>['author']>;
  userId: string;
  wait?: true | false;
}) => {
  if (project.gitUrl && project.gitAutoSync) {
    const repository = await getRepository({ projectId: project.id! });
    const remote = (await repository.listRemotes()).find((i) => i.remote === defaultRemote);
    if (remote && parseAuth(parseURL(remote.url).auth).password) {
      broadcast(project.id, EVENTS.PROJECT.SYNC_TO_GIT, { done: false });

      await syncRepository({ repository, ref: project.gitDefaultBranch, author });
      await project.update({ gitLastSyncedAt: new Date() }, { silent: true });

      broadcast(project.id, EVENTS.PROJECT.SYNC_TO_GIT, { done: true });
    }
  }

  if (project.didSpaceAutoSync) {
    broadcast(project.id, EVENTS.PROJECT.SYNC_TO_DID_SPACE, { done: false });

    if (wait) {
      await syncToDidSpace({ project, userId });

      broadcast(project.id, EVENTS.PROJECT.SYNC_TO_DID_SPACE, { done: true });
    } else {
      // 开始同步
      syncToDidSpace({ project, userId })
        .then(() => {
          // 同步成功
          broadcast(project.id, EVENTS.PROJECT.SYNC_TO_DID_SPACE, { done: true });
        })
        .catch((error) => {
          // 同步失败了
          logger.error(error);
          broadcast(project.id, EVENTS.PROJECT.SYNC_TO_DID_SPACE, { error, done: true });
        });
    }
  }
};

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

  const repositoryPath = repositoryRoot(project.id);
  const repositoryCooperativePath = repositoryCooperativeRoot(project.id);
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

  await project.update({ didSpaceLastSyncedAt: new Date() }, { silent: true });
}
function getReadmeOfProject(project: { name: string; description: string }) {
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

export async function getAssistantsOfRepository({
  projectId,
  ref,
  working,
}: {
  projectId: string;
  ref: string;
  working?: boolean;
}) {
  const repository = await getRepository({ projectId });
  if (working) {
    const w = await repository.working({ ref });
    return Object.values(w.syncedStore.files)
      .filter((i): i is AssistantYjs => !!i && isAssistant(i))
      .map((i) => fileFromYjs(i) as Assistant);
  }
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
  agentId,
  rejectOnEmpty,
}: {
  repository: Repository<any>;
  ref: string;
  working?: boolean;
  agentId: string;
  rejectOnEmpty: true | Error;
}): Promise<Assistant>;
export async function getAssistantFromRepository({
  repository,
  ref,
  working,
  agentId,
  rejectOnEmpty,
}: {
  repository: Repository<any>;
  ref: string;
  working?: boolean;
  agentId: string;
  rejectOnEmpty?: false;
}): Promise<Assistant | undefined>;
export async function getAssistantFromRepository({
  repository,
  ref,
  working,
  agentId,
  rejectOnEmpty,
}: {
  repository: Repository<any>;
  ref: string;
  working?: boolean;
  agentId: string;
  rejectOnEmpty?: boolean | Error;
}): Promise<Assistant | undefined> {
  let file: Assistant;

  if (working) {
    const working = await repository.working({ ref });
    const f = working.syncedStore.files[agentId];
    file = f && fileFromYjs(f);
  } else {
    const p = (await repository.listFiles({ ref })).find((i) => i.endsWith(`${agentId}.yaml`));
    file = p && parse(Buffer.from((await repository.readBlob({ ref, filepath: p })).blob).toString());
  }

  if (!file || !isAssistant(file)) {
    if (rejectOnEmpty) {
      throw typeof rejectOnEmpty !== 'boolean'
        ? rejectOnEmpty
        : new Error(`no such assistant ${JSON.stringify({ ref, agentId, working })}`);
    }
  }

  return file;
}

export async function getFileFromRepository<F extends FileType>({
  repository,
  ref,
  working,
  filepath,
}: {
  repository: Awaited<ReturnType<typeof getRepository>>;
  ref: string;
  working?: boolean;
  filepath: string;
}): Promise<F | undefined> {
  let file: FileTypeYjs | undefined;

  if (working) {
    const working = await repository.working({ ref });
    const fileId = Object.entries(working.syncedStore.tree).find((i) => i[1] === filepath)?.[0];
    if (fileId) {
      file = working.syncedStore.files[fileId];
    }
  } else {
    try {
      const raw = (await repository.readBlob({ ref, filepath })).blob;
      file = (await repository.options.parse(filepath, raw, { ref }))?.data || undefined;
    } catch (error) {
      if (!(error instanceof Errors.NotFoundError)) {
        logger.error('read project config error', { error });
      }
    }
  }

  return file ? (fileFromYjs(file) as F) : undefined;
}

export async function getProjectMemoryVariables({
  repository,
  ref,
  working,
}: {
  repository: Awaited<ReturnType<typeof getRepository>>;
  ref: string;
  working?: boolean;
}) {
  return getFileFromRepository<Variables>({ repository, ref, filepath: VARIABLE_FILE_PATH, working });
}

export async function getProjectConfig({
  repository,
  ref,
  working,
}: {
  repository: Awaited<ReturnType<typeof getRepository>>;
  ref: string;
  working?: boolean;
}) {
  return getFileFromRepository<ConfigFile>({ repository, ref, filepath: CONFIG_FILE_PATH, working });
}

export async function getEntryFromRepository({
  projectId,
  ref,
  working,
}: {
  projectId: string;
  ref: string;
  working?: boolean;
}): Promise<Assistant | undefined> {
  const repository = await getRepository({ projectId });

  const config = await getProjectConfig({ repository, ref, working });
  const entry = config?.entry;
  if (!entry) return undefined;

  return getAssistantFromRepository({ repository, ref, working, agentId: entry });
}

function renameSyncedStoreFileKey(working: Working<FileTypeYjs>, key: string, newKey: string) {
  working.transact(() => {
    const file = working.syncedStore.files[key];
    if (!file) return;

    if (working.syncedStore.files[key]) delete working.syncedStore.files[key];
    if (working.syncedStore.tree[key]) delete working.syncedStore.tree[key];

    working.syncedStore.tree[newKey] = newKey;
    working.syncedStore.files[newKey] = JSON.parse(JSON.stringify(file));
  });
}
