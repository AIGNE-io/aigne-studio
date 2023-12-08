import { readdirSync, rmSync, writeFileSync } from 'fs';
import path from 'path';

import { Repository, Transaction } from '@blocklet/co-git/repository';
import Database from '@blocklet/sdk/lib/database';
import { glob } from 'glob';
import pick from 'lodash/pick';
import sortBy from 'lodash/sortBy';
import { nanoid } from 'nanoid';
import { Worker } from 'snowflake-uuid';
import { parse, stringify } from 'yaml';

import { wallet } from '../libs/auth';
import { Config } from '../libs/env';
import { defaultModel } from '../libs/models';
import ProjectModel from './models/projects';
import type { Parameter, ParameterYjs, Template } from './templates';

const idGenerator = new Worker();

export const nextProjectId = () => idGenerator.nextId().toString();

export interface Project
  extends Pick<Template, 'temperature' | 'topP' | 'presencePenalty' | 'frequencyPenalty' | 'maxTokens'> {
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

export interface TemplateYjs
  extends Omit<Template, 'prompts' | 'branch' | 'datasets' | 'parameters' | 'tests' | 'tools'> {
  prompts?: {
    [key: string]: {
      index: number;
      data: NonNullable<Template['prompts']>[number];
    };
  };

  parameters?: { [key: string]: ParameterYjs };

  branch?: {
    branches: {
      [key: string]: {
        index: number;
        data: { id: string; template?: { id: string; name?: string }; description: string };
      };
    };
  };

  datasets?: {
    [key: string]: {
      index: number;
      data: { id: string; type: 'vectorStore'; vectorStore?: { id: string; name?: string } };
    };
  };

  tests?: {
    [key: string]: {
      index: number;
      data: NonNullable<Template['tests']>[number];
    };
  };

  tools?: {
    [key: string]: {
      index: number;
      data: NonNullable<Template['tools']>[number];
    };
  };
}

export interface ExecuteBlock {
  id: string;
  selectType?: 'all' | 'selectByPrompt';
  selectByPrompt?: string;
  tools?: { id: string; parameters?: { [key: string]: string } }[];
  formatResultType?: 'none' | 'asContext';
  variable?: string;
}

export interface ExecuteBlockYjs extends Omit<ExecuteBlock, 'tools'> {
  tools?: { [key: string]: { index: number; data: NonNullable<ExecuteBlock['tools']>[number] } };
}

export type FileTypeYjs = PromptFileYjs | ApiFileYjs | FunctionFileYjs | { $base64: string };

export type FileType = PromptFile | ApiFile | FunctionFile | { $base64: string };

export type Assistant = PromptFile | ApiFile | FunctionFile;

export type AssistantYjs = PromptFileYjs | ApiFileYjs | FunctionFileYjs;

export type PromptMessage = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content?: string;
  name?: string;
};

export type Prompt =
  | {
      type: 'message';
      data: PromptMessage;
      visibility?: 'hidden';
    }
  | {
      type: 'executeBlock';
      data: ExecuteBlock;
      visibility?: 'hidden';
    };

export type PromptYjs =
  | {
      type: 'message';
      data: PromptMessage;
      visibility?: 'hidden';
    }
  | {
      type: 'executeBlock';
      data: ExecuteBlockYjs;
      visibility?: 'hidden';
    };

export interface PromptFile {
  id: string;
  type: 'prompt';
  name?: string;
  parameters?: Parameter[];
  description?: string;
  prompts?: Prompt[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  tests?: {
    id: string;
    parameters: { [key: string]: any };
    output?: string;
    error?: { message: string };
    createdBy: string;
  }[];
  formatResultType?: 'none';
  tags?: string[];
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
  model?: string;
}

type ArrayToYjs<T extends Array<{ id: string }>> = { [key: string]: { index: number; data: T[number] } };

export interface PromptFileYjs extends Omit<PromptFile, 'parameters' | 'prompts' | 'tests'> {
  parameters?: { [key: string]: { index: number; data: ParameterYjs } };
  prompts?: { [key: string]: { index: number; data: PromptYjs } };
  tests?: ArrayToYjs<NonNullable<PromptFile['tests']>>;
}

export interface ApiFile {
  id: string;
  type: 'api';
  name?: string;
  description?: string;
  parameters?: Parameter[];
  prepareExecutes?: ExecuteBlock[];
  requestParameters?: { id: string; key?: string; value?: string }[];
  requestMethod?: string;
  requestUrl?: string;
  requestHeaders: { id: string; key?: string; value?: string }[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  tests?: {
    id: string;
    parameters: { [key: string]: any };
    output?: string;
    error?: { message: string };
    createdBy: string;
  }[];
  formatResultType?: 'none';
  tags?: string[];
}

export interface ApiFileYjs extends Omit<ApiFile, 'parameters' | 'prepareExecutes' | 'tests' | 'requestParameters'> {
  parameters?: { [key: string]: { index: number; data: ParameterYjs } };
  prepareExecutes?: { [key: string]: { index: number; data: ExecuteBlockYjs } };
  tests?: ArrayToYjs<NonNullable<ApiFile['tests']>>;
  requestParameters?: ArrayToYjs<NonNullable<ApiFile['requestParameters']>>;
}

export interface FunctionFile {
  id: string;
  type: 'function';
  name?: string;
  description?: string;
  parameters?: Parameter[];
  prepareExecutes?: ExecuteBlock[];
  code?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  tests?: {
    id: string;
    parameters: { [key: string]: any };
    output?: string;
    error?: { message: string };
    createdBy: string;
  }[];
  formatResultType?: 'none';
  tags?: string[];
}

export interface FunctionFileYjs extends Omit<FunctionFile, 'parameters' | 'prepareExecutes' | 'tests'> {
  parameters?: { [key: string]: { index: number; data: ParameterYjs } };
  prepareExecutes?: { [key: string]: { index: number; data: ExecuteBlockYjs } };
  tests?: ArrayToYjs<NonNullable<FunctionFile['tests']>>;
}

export function isAssistant(assistant: FileType): assistant is Assistant;
export function isAssistant(assistant: FileTypeYjs): assistant is AssistantYjs;
export function isAssistant(assistant: FileType | FileTypeYjs): assistant is FileType | AssistantYjs {
  return typeof (assistant as any).id === 'string' && ['prompt', 'api', 'function'].includes((assistant as any).type);
}

export function isPromptFile(file: FileType): file is PromptFile;
export function isPromptFile(file: FileTypeYjs): file is PromptFileYjs;
export function isPromptFile(file: FileType | FileTypeYjs): file is PromptFile | PromptFileYjs {
  return (file as any).type === 'prompt';
}

export function isApiFile(file: FileType): file is ApiFile;
export function isApiFile(file: FileTypeYjs): file is ApiFileYjs;
export function isApiFile(file: FileType | FileTypeYjs): file is ApiFile | ApiFileYjs {
  return (file as any).type === 'api';
}

export function isFunctionFile(file: FileType): file is FunctionFile;
export function isFunctionFile(file: FileTypeYjs): file is FunctionFileYjs;
export function isFunctionFile(file: FileType | FileTypeYjs): file is FunctionFile | FunctionFileYjs {
  return (file as any).type === 'function';
}

export function isRawFile(file: FileType): file is { $base64: string };
export function isRawFile(file: FileTypeYjs): file is { $base64: string };
export function isRawFile(file: FileType | FileTypeYjs): file is { $base64: string } {
  return typeof (file as any).$base64 === 'string';
}

export function isPromptMessage(prompt: Prompt): prompt is Extract<Prompt, { type: 'message' }>;
export function isPromptMessage(prompt: PromptYjs): prompt is Extract<PromptYjs, { type: 'message' }>;
export function isPromptMessage(
  prompt: Prompt | PromptYjs
): prompt is Extract<Prompt | PromptYjs, { type: 'message' }> {
  return prompt.type === 'message';
}

export function isExecuteBlock(prompt: Prompt): prompt is Extract<Prompt, { type: 'executeBlock' }>;
export function isExecuteBlock(prompt: PromptYjs): prompt is Extract<PromptYjs, { type: 'executeBlock' }>;
export function isExecuteBlock(
  prompt: Prompt | PromptYjs
): prompt is Extract<Prompt | PromptYjs, { type: 'executeBlock' }> {
  return prompt.type === 'executeBlock';
}

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

export function parameterToYjs(parameter: Parameter): ParameterYjs {
  return parameter.type === 'select'
    ? {
        ...parameter,
        options:
          parameter.options &&
          Object.fromEntries(parameter.options.map((option, index) => [option.id, { index, data: option }])),
      }
    : parameter;
}

export function parameterFromYjs(parameter: ParameterYjs): Parameter {
  return parameter.type === 'select'
    ? {
        ...parameter,
        options: parameter.options && sortBy(Object.values(parameter.options), (i) => i.index).map((i) => i.data),
      }
    : parameter;
}

export function parametersToYjs(parameters: Parameter[]): { [key: string]: { index: number; data: ParameterYjs } } {
  return arrayToYjs(parameters.map(parameterToYjs));
}

export function parametersFromYjs(parameters: { [key: string]: { index: number; data: ParameterYjs } }): Parameter[] {
  return sortBy(Object.values(parameters), (i) => i.index).map(({ data }) => parameterFromYjs(data));
}

export function executeBlockToYjs(block: ExecuteBlock): ExecuteBlockYjs {
  return {
    ...block,
    tools: block.tools && arrayToYjs(block.tools),
  };
}

export function executeBlockFromYjs(block: ExecuteBlockYjs): ExecuteBlock {
  return {
    ...block,
    tools: block.tools && arrayFromYjs(block.tools),
  };
}

export function promptToYjs(prompt: Prompt): PromptYjs {
  if (isExecuteBlock(prompt)) {
    return { ...prompt, data: executeBlockToYjs(prompt.data) };
  }
  return prompt;
}

export function promptFromYjs(prompt: PromptYjs): Prompt {
  if (isExecuteBlock(prompt)) {
    return { ...prompt, data: executeBlockFromYjs(prompt.data) };
  }
  return prompt;
}

export function arrayToYjs<T extends { id: string }>(arr: T[]): { [key: string]: { index: number; data: T } };
export function arrayToYjs<T extends { id: string }, I>(
  arr: T[],
  iter: (item: T) => I
): { [key: string]: { index: number; data: I } };
export function arrayToYjs<T extends { id: string }, I>(
  arr: T[],
  iter?: (item: T) => I
): { [key: string]: { index: number; data: I | T } } {
  return Object.fromEntries(arr.map((data, index) => [data.id, { index, data: iter ? iter(data) : data }]));
}

export function arrayFromYjs<T>(arr: { [key: string]: { index: number; data: T } }): T[];
export function arrayFromYjs<T, I>(arr: { [key: string]: { index: number; data: T } }, iter: (item: T) => I): I[];
export function arrayFromYjs<T, I>(
  arr: { [key: string]: { index: number; data: T } },
  iter?: (item: T) => I
): (T | I)[] {
  return sortBy(Object.values(arr), (i) => i.index).map(({ data }) => (iter ? iter(data) : data));
}

export function fileToYjs(file: FileType): FileTypeYjs {
  if (isPromptFile(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayToYjs(file.parameters, parameterToYjs),
      prompts:
        file.prompts &&
        arrayToYjs(
          file.prompts.map((i) => ({ id: i.data.id, data: i })),
          (i) => promptToYjs(i.data)
        ),
      tests: file.tests && arrayToYjs(file.tests),
    };
  }
  if (isFunctionFile(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayToYjs(file.parameters, parameterToYjs),
      prepareExecutes: file.prepareExecutes && arrayToYjs(file.prepareExecutes, executeBlockToYjs),
      tests: file.tests && arrayToYjs(file.tests),
    };
  }
  if (isApiFile(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayToYjs(file.parameters, parameterToYjs),
      prepareExecutes: file.prepareExecutes && arrayToYjs(file.prepareExecutes, executeBlockToYjs),
      tests: file.tests && arrayToYjs(file.tests),
      requestParameters: file.requestParameters && arrayToYjs(file.requestParameters),
    };
  }

  return file;
}

export function fileFromYjs(file: FileTypeYjs): FileType {
  if (isPromptFile(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayFromYjs(file.parameters, parameterFromYjs),
      prompts: file.prompts && arrayFromYjs(file.prompts, promptFromYjs),
      tests: file.tests && arrayFromYjs(file.tests),
    };
  }
  if (isFunctionFile(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayFromYjs(file.parameters, parameterFromYjs),
      prepareExecutes: file.prepareExecutes && arrayFromYjs(file.prepareExecutes, executeBlockFromYjs),
      tests: file.tests && arrayFromYjs(file.tests),
    };
  }
  if (isApiFile(file)) {
    return {
      ...file,
      parameters: file.parameters && arrayFromYjs(file.parameters, parameterFromYjs),
      prepareExecutes: file.prepareExecutes && arrayFromYjs(file.prepareExecutes, executeBlockFromYjs),
      tests: file.tests && arrayFromYjs(file.tests),
      requestParameters: file.requestParameters && arrayFromYjs(file.requestParameters),
    };
  }

  return file;
}

export function templateToYjs(template: Template): TemplateYjs {
  return {
    ...template,
    prompts:
      template.prompts &&
      Object.fromEntries(
        template.prompts?.map((prompt, index) => [
          prompt.id,
          {
            index,
            data: prompt,
          },
        ])
      ),
    parameters:
      template.parameters &&
      Object.fromEntries(
        Object.entries(template.parameters).map(([param, parameter]) => [
          param,
          parameter.type === 'select'
            ? {
                ...parameter,
                options:
                  parameter.options &&
                  Object.fromEntries(parameter.options.map((option, index) => [option.id, { index, data: option }])),
              }
            : parameter,
        ])
      ),
    branch: template.branch && {
      branches: Object.fromEntries(
        template.branch.branches.map((branch, index) => [branch.id, { index, data: branch }])
      ),
    },
    datasets:
      template.datasets &&
      Object.fromEntries(template.datasets.map((dataset, index) => [dataset.id, { index, data: dataset }])),
    tests: template.tests && Object.fromEntries(template.tests.map((test, index) => [test.id, { index, data: test }])),
    tools: template.tools && Object.fromEntries(template.tools.map((tool, index) => [tool.id, { index, data: tool }])),
  };
}

export function yjsToTemplate(template: TemplateYjs): Template {
  return {
    ...template,
    prompts: template.prompts && sortBy(Object.values(template.prompts), 'index').map(({ data }) => data),
    parameters:
      template.parameters &&
      Object.fromEntries(
        Object.entries(template.parameters).map(([param, parameter]) => [
          param,
          parameter.type === 'select'
            ? {
                ...parameter,
                options:
                  parameter.options && sortBy(Object.values(parameter.options), (i) => i.index).map((i) => i.data),
              }
            : parameter,
        ])
      ),
    branch: template.branch && {
      branches: sortBy(Object.values(template.branch.branches), 'index').map(({ data }) => data),
    },
    datasets: template.datasets && sortBy(Object.values(template.datasets), 'index').map(({ data }) => data),
    tests: template.tests && sortBy(Object.values(template.tests), 'index').map(({ data }) => data),
    tools: template.tools && sortBy(Object.values(template.tools), 'index').map(({ data }) => data),
  };
}

export async function getTemplatesFromRepository({ projectId, ref }: { projectId: string; ref: string }) {
  const repository = await getRepository({ projectId });
  const files = await repository.listFiles({ ref }).then((files) => files.filter((i) => i.endsWith('.yaml')));
  return Promise.all(
    files.map((filepath) =>
      repository.readBlob({ ref, filepath }).then(
        ({ blob }) =>
          ({
            projectId,
            ref,
            parent: filepath.split('/').slice(0, -1),
            ...parse(Buffer.from(blob).toString()),
          } as Template)
      )
    )
  );
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
