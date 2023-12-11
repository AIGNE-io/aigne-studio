import path from 'path';

import { Router } from 'express';

import { ensureComponentCallOrPromptsEditor } from '../libs/security';
import { Template, getTemplate } from '../store/0.1.157/templates';
import { defaultBranch, getRepository } from '../store/repository';

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

    const files = (
      await Promise.all(
        list.map(async (filepath) => {
          const { dir, base } = path.parse(filepath);
          const parent = dir.split(path.sep);

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
