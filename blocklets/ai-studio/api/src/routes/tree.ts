import path from 'path';

import { Router } from 'express';
import { parse } from 'yaml';

import { ensureComponentCallOrPromptsEditor } from '../libs/security';
import { getRepository } from '../store/projects';

export function treeRoutes(router: Router) {
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
