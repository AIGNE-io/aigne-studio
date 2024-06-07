import path from 'path';

import Project from '@api/store/models/project';
import { Assistant } from '@blocklet/ai-runtime/types';
import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';

import { ensureComponentCallOrPromptsEditor } from '../libs/security';
import {
  PROMPTS_FOLDER_NAME,
  getAssistantFromRepository,
  getAssistantIdFromPath,
  getRepository,
} from '../store/repository';
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
  router.get('/projects/:projectId/tree/:ref', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');
    const project = await Project.findOne({ where: { id: projectId }, rejectOnEmpty: new Error('Project not found') });

    checkProjectPermission({
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
            const assistantId = getAssistantIdFromPath(filepath);
            if (assistantId) {
              return {
                type: 'file',
                name: base,
                parent,
                meta: await getAssistantFromRepository({ repository, ref, assistantId }),
              };
            }
          }
          return undefined;
        })
      )
    ).filter((i): i is NonNullable<typeof i> => !!i);

    res.json({ files });
  });
}
