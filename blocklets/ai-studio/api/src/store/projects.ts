import path from 'path';

import { Repository } from '@blocklet/co-git/repository';
import Database from '@blocklet/sdk/lib/database';
import sortBy from 'lodash/sortBy';
import { Worker } from 'snowflake-uuid';
import { parse, stringify } from 'yaml';

import { wallet } from '../libs/auth';
import env from '../libs/env';
import { defaultModel } from '../libs/models';
import type { ParameterYjs, Role, Template } from './templates';

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
        parent: [],
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

export interface TemplateYjs extends Omit<Template, 'prompts' | 'branch' | 'datasets' | 'parameters' | 'tests'> {
  prompts?: {
    [key: string]: {
      index: number;
      data: {
        id: string;
        content?: string;
        role?: Role;
      };
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
          return templateToYjs(parse(Buffer.from(content).toString()));
        }

        return {
          $base64: Buffer.from(content).toString('base64'),
        };
      },
      stringify: async (_, content) => {
        if (isTemplate(content)) {
          return stringify(yjsToTemplate(content));
        }

        const base64 = content.$base64;

        return typeof base64 === 'string' ? Buffer.from(base64, 'base64') : '';
      },
    });
    return repository;
  })();

  return repositories[projectId]!;
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
            ...parse(Buffer.from(blob).toString()),
          } as Template)
      )
    )
  );
}
