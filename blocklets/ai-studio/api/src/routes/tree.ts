import path from 'path';

import { Router } from 'express';

import { ensureComponentCallOrPromptsEditor } from '../libs/security';
import { Template, getTemplate } from '../store/0.1.157/templates';
import { defaultBranch, getRepository } from '../store/projects';

export interface File {
  type: 'file';
  name: string;
  parent: string[];
}

export interface Folder {
  type: 'folder';
  name: string;
  parent: string[];
}

export type Entry = File | Folder;

export type EntryWithMeta = Exclude<Entry, File> | (File & { meta: Template });

export function treeRoutes(router: Router) {
  router.get('/projects/:projectId/tree/:ref', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const ref = req.params.ref || defaultBranch;

    const repository = await getRepository({ projectId });

    const list = await repository.listFiles({ ref });

    // NOTE: 判断是否是升级 git repo 结构前的数据，如果是升级前（没有 prompts 文件夹）的话需要自动添加 prompts 文件夹，统一结构。
    const needAppendPromptsFolder = !list.find((i) => i === 'README.md');

    const files = (
      await Promise.all(
        list.map(async (filepath) => {
          const { dir, base } = path.parse(filepath);
          const parent = dir.split(path.sep);

          if (needAppendPromptsFolder) parent.unshift('prompts');

          if (filepath.endsWith('.yaml')) {
            return {
              type: 'file',
              name: base,
              parent,
              meta: await getTemplate({ repository, ref, filepath }),
            };
          }
          return undefined;
        })
      )
    ).filter((i): i is NonNullable<typeof i> => !!i);
    res.json({ files });
  });
}
