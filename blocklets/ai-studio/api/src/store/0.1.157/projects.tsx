import path from 'path';

import { Repository } from '@blocklet/co-git/repository';
import { Database } from '@blocklet/sdk/lib/database';
import sortBy from 'lodash/sortBy';
import { nanoid } from 'nanoid';
import { parse, stringify } from 'yaml';

import { wallet } from '../../libs/auth';
import { Config } from '../../libs/env';
import type { ParameterYjs, Template } from './templates';

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
        data: {
          id: string;
          template?: { id: string; name?: string };
          description: string;
        };
      };
    };
  };

  datasets?: {
    [key: string]: {
      index: number;
      data: {
        id: string;
        type: 'vectorStore';
        vectorStore?: { id: string; name?: string };
      };
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

type FileType = TemplateYjs | { $base64: string };

export function isTemplate(file: FileType): file is TemplateYjs {
  return typeof (file as any).id === 'string';
}

const repositories: { [key: string]: Promise<Repository<FileType>> } = {};

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
    const repository = await Repository.init<FileType>({
      root: repositoryRoot(projectId),
      initialCommit: {
        message: 'init',
        author: author ?? { name: 'AI Studio', email: wallet.address },
      },
      parse: async (filepath, content) => {
        const { dir, ext } = path.parse(filepath);
        const [root] = filepath.split('/');

        if (ext === '.yaml') {
          const json = parse(Buffer.from(content).toString());
          if (typeof json?.id === 'string') {
            const data = templateToYjs(json);
            const parent = dir.replace(/^\.\/?/, '');
            const filename = `${data.id}.yaml`;
            return {
              filepath: path.join(root === PROMPTS_FOLDER_NAME ? '' : PROMPTS_FOLDER_NAME, parent, filename),
              key: data.id,
              data,
            };
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
