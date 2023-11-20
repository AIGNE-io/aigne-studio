import { readdirSync, rmSync, writeFileSync } from 'fs';
import path from 'path';

import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import { glob } from 'glob';
import Joi from 'joi';

import { ensureComponentCallOrPromptsEditor, isRefReadOnly } from '../libs/security';
import Project from '../store/models/projects';
import { getRepository, syncRepository } from '../store/projects';

export interface WorkingCommitInput {
  branch: string;
  message: string;
}

export function workingRoutes(router: Router) {
  const createBranchInputSchema = Joi.object<WorkingCommitInput>({
    branch: Joi.string().empty([null, '']),
    message: Joi.string().required(),
  });

  router.post(
    '/projects/:projectId/workings/:ref/commit',
    user(),
    ensureComponentCallOrPromptsEditor(),
    async (req, res) => {
      const { fullName, did: userId, role } = req.user!;

      const { projectId, ref } = req.params;
      if (!projectId || !ref) throw new Error('Missing required params `projectId` or `ref`');

      const input = await createBranchInputSchema.validateAsync(req.body, { stripUnknown: true });

      if (isRefReadOnly({ ref: input.branch, role })) {
        throw new Error(`commit to read only branch ${input.branch} is forbidden`);
      }

      const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });
      const repository = await getRepository({ projectId });
      const working = await repository.working({ ref });
      await working.commit({
        ref,
        branch: input.branch,
        message: input.message,
        author: { name: fullName, email: userId },
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

      if (project.gitUrl && project.gitAutoSync) {
        await syncRepository({ repository, ref, author: { name: fullName, email: userId } });
        await project.update({ gitLastSyncedAt: new Date() });
      }

      return res.json({});
    }
  );
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
