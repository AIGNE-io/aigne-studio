import { readdirSync, rmSync, writeFileSync } from 'fs';
import path from 'path';

import { Repository } from '@blocklet/co-git/repository';
import Database from '@blocklet/sdk/lib/database';
import { glob } from 'glob';
import sortBy from 'lodash/sortBy';
import { nanoid } from 'nanoid';
import { Worker } from 'snowflake-uuid';
import { parse, stringify } from 'yaml';

import { wallet } from '../libs/auth';
import env from '../libs/env';
import { defaultModel } from '../libs/models';
import type { ParameterYjs, Template } from './templates';

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
  files: (Omit<Template, 'id'> & { parent: string[] })[];
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
        name: 'Hello World',
        prompts: [
          {
            id: '1',
            content: 'Say hello in {{language}}!',
            role: 'user',
          },
        ],
        parameters: {
          language: {
            defaultValue: 'English',
          },
        },
        createdBy: wallet.address,
        updatedBy: wallet.address,
        createdAt: '2023-09-30T12:23:04.603Z',
        updatedAt: '2023-09-30T12:23:04.603Z',
        public: false,
      },
    ],
  },
];

export const defaultBranch = 'main';

export const defaultRemote = 'origin';

export interface TemplateYjs
  extends Omit<Template, 'prompts' | 'branch' | 'datasets' | 'parameters' | 'tests' | 'functions'> {
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

  functions?: {
    [key: string]: {
      index: number;
      data: NonNullable<Template['functions']>[number];
    };
  };
}

type FileType = TemplateYjs | { $base64: string };

export function isTemplate(file: FileType): file is TemplateYjs {
  return typeof (file as any).id === 'string';
}

const repositories: { [key: string]: Promise<Repository<FileType>> } = {};

export const repositoryRoot = (projectId: string) => path.join(env.dataDir, 'repositories', projectId);

export async function getRepository({ projectId }: { projectId: string }) {
  repositories[projectId] ??= (async () => {
    const repository = await Repository.init<TemplateYjs | { $base64: string }>({
      root: repositoryRoot(projectId),
      initialCommit: { message: 'init', author: { name: 'AI Studio', email: wallet.address } },
      parse: async (filepath, content) => {
        if (path.extname(filepath) === '.yaml') {
          const data = templateToYjs(parse(Buffer.from(content).toString()));
          const parent = path.dirname(filepath).replace(/^\.\/?/, '');
          const filename = `${data.id}.yaml`;
          return { filepath: path.join(parent, filename), key: data.id, data };
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
        if (isTemplate(content)) {
          const data = stringify(yjsToTemplate(content));
          const parent = path.dirname(filepath).replace(/^\.\/?/, '');
          const filename = `${content.name || 'Unnamed'}.${content.id}.yaml`;
          const newFilepath = path.join(parent, filename);

          return {
            filepath: newFilepath,
            data,
          };
        }

        const base64 = content.$base64;

        const data = typeof base64 === 'string' ? Buffer.from(base64, 'base64') : '';

        return { filepath, data };
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

export async function commitWorking({
  project,
  ref,
  branch,
  message,
  author,
}: {
  project: Project;
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
    functions:
      template.functions &&
      Object.fromEntries(template.functions.map((func, index) => [func.id, { index, data: func }])),
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
    functions: template.functions && sortBy(Object.values(template.functions), 'index').map(({ data }) => data),
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
