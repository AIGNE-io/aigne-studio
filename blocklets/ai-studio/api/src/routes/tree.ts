import path from 'path';

import { NotFoundError } from '@api/libs/error';
import Project from '@api/store/models/project';
import { Assistant } from '@blocklet/ai-runtime/types';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { session } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';

import { ensureComponentCallOrPromptsEditor } from '../libs/security';
import { PROMPTS_FOLDER_NAME, getAssistantIdFromPath, getRepository } from '../store/repository';
import { checkProjectPermission } from './project';

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

export type EntryWithMeta = Exclude<Entry, File> | (File & { meta: Assistant });

export function treeRoutes(router: Router) {
  router.get('/projects/:projectId/tree/:ref', session(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');
    const project = await Project.findOne({
      where: { id: projectId },
      rejectOnEmpty: new NotFoundError('Project not found'),
    });

    await checkProjectPermission({
      req,
      project,
    });

    const ref = req.params.ref || project.gitDefaultBranch;

    const repository = await getRepository({ projectId });

    const list = await repository.listFiles({ ref });

    const files = (
      await Promise.all(
        list.map(async (filepath) => {
          const { dir, base } = path.parse(filepath);
          const parent = dir.split(path.sep);

          if (filepath.startsWith(`${PROMPTS_FOLDER_NAME}/`) && filepath.endsWith('.yaml')) {
            const agentId = getAssistantIdFromPath(filepath);
            if (agentId) {
              return {
                type: 'file',
                name: base,
                parent,
                meta: await repository.readAgent({ ref, agentId }),
              };
            }
          }
          return undefined;
        })
      )
    ).filter(isNonNullable);

    res.json({ files });
  });
}
