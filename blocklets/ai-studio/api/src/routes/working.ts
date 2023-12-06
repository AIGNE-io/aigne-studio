import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';

import { ensureComponentCallOrPromptsEditor, isRefReadOnly } from '../libs/security';
import Project from '../store/models/projects';
import { autoSyncRemoteRepoIfNeeded, commitWorking } from '../store/projects';

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
      const author = { name: fullName, email: userId };
      await commitWorking({
        project: project.toJSON(),
        ref,
        branch: input.branch,
        message: input.message,
        author,
      });

      await autoSyncRemoteRepoIfNeeded({ project, author });

      project.changed('updatedAt', true);
      await project.update({ updatedAt: new Date() });

      return res.json({ project });
    }
  );
}
