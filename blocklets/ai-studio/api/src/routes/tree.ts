import path from 'path';

import { Router } from 'express';
import { parse } from 'yaml';

import { ensureComponentCallOrPromptsEditor } from '../libs/security';
import { defaultBranch, getRepository } from '../store/projects';
import { Template, getTemplate } from '../store/templates';

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

    const files = (
      await Promise.all(
        (
          await repository.listFiles({ ref })
        ).map(async (filepath) => {
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

  router.get(
    '/projects/:projectId/tree/:ref/:filepath(*.yaml)',
    ensureComponentCallOrPromptsEditor(),
    async (req, res) => {
      const { projectId, ref, filepath } = req.params;
      if (!projectId || !ref || !filepath) {
        throw new Error('Missing required params `projectId` or `ref` or `filepath`');
      }

      const repository = await getRepository({ projectId });

      const file = await repository.readBlob({
        ref,
        filepath: await repository.findFile(path.parse(filepath).name, { ref }),
      });
      const data = parse(Buffer.from(file.blob).toString());

      res.json(data);
    }
  );
}
