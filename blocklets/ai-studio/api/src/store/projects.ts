import path from 'path';

import { Repository } from '@blocklet/co-git/repository';
import { $lexical2text, $text2lexical, tryParseJSONObject } from '@blocklet/prompt-editor/utils';
import Database from '@blocklet/sdk/lib/database';
import { omit, sortBy } from 'lodash';
import { parse, stringify } from 'yaml';

import { wallet } from '../libs/auth';
import env from '../libs/env';
import { Role, Template } from './templates';

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

export interface TemplateYjs extends Omit<Template, 'prompts' | 'branch' | 'datasets'> {
  prompts?: {
    [key: string]: {
      index: number;
      data: {
        id: string;
        content?: string;
        contentLexicalJson?: string;
        role?: Role;
      };
    };
  };

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
}

type FileType = TemplateYjs | { $base64: string };

export function isTemplate(file: FileType): file is TemplateYjs {
  return typeof (file as any).id === 'string';
}

const repositories: { [key: string]: Promise<Repository<FileType>> } = {};

export async function getRepository({ projectId }: { projectId: string }) {
  repositories[projectId] ??= (async () => {
    const repository = await Repository.init<TemplateYjs | { $base64: string }>({
      root: path.join(env.dataDir, 'repositories', projectId),
      initialCommit: { message: 'init', author: { name: 'AI Studio', email: wallet.address } },
      parse: async (filepath, content) => {
        if (path.extname(filepath) === '.yaml') {
          const template: Template = parse(Buffer.from(content).toString());

          let prompts;
          if (template.prompts) {
            const list = template.prompts?.map(async (prompt) => {
              const contentLexicalJson = await $text2lexical(prompt.content || '', prompt.role);
              return { ...prompt, contentLexicalJson };
            });

            const result = await Promise.all(list);
            const format = result.map((prompt, index) => [prompt.id, { index, data: prompt }]);
            prompts = Object.fromEntries(format);
          }

          return {
            ...template,
            prompts,
            branch: template.branch && {
              branches: Object.fromEntries(
                template.branch.branches.map((branch, index) => [branch.id, { index, data: branch }])
              ),
            },
            datasets:
              template.datasets &&
              Object.fromEntries(template.datasets.map((dataset, index) => [dataset.id, { index, data: dataset }])),
          };
        }

        return {
          $base64: Buffer.from(content).toString('base64'),
        };
      },
      stringify: async (_, content) => {
        if (isTemplate(content)) {
          let prompts;
          if (content.prompts) {
            const arr = sortBy(Object.values(content.prompts), 'index').map(async ({ data }) => {
              if (data.contentLexicalJson && tryParseJSONObject(data.contentLexicalJson)) {
                const res = await $lexical2text(data.contentLexicalJson);
                return { ...omit(data, 'contentLexicalJson'), ...res };
              }

              return { ...omit(data, 'contentLexicalJson') };
            });

            prompts = await Promise.all(arr);
          }

          const template: Template = {
            ...content,
            prompts,
            branch: content.branch && {
              branches: sortBy(Object.values(content.branch.branches), 'index').map(({ data }) => data),
            },
            datasets: content.datasets && sortBy(Object.values(content.datasets), 'index').map(({ data }) => data),
          };

          return stringify(template);
        }

        const base64 = content.$base64;

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
