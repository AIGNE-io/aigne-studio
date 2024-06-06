import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';

import { ensureComponentCallOrPromptsEditor, isRefReadOnly } from '../libs/security';
import Project from '../store/models/project';
import { autoSyncIfNeeded, commitWorking, defaultBranch } from '../store/repository';

export interface WorkingCommitInput {
  skipCommitIfNoChanges?: boolean;
  branch: string;
  message: string;
}

export function workingRoutes(router: Router) {
  const createBranchInputSchema = Joi.object<WorkingCommitInput>({
    skipCommitIfNoChanges: Joi.boolean().empty([null, '']),
    branch: Joi.string().empty([null, '']),
    message: Joi.string().required(),
  });

  router.post(
    '/projects/:projectId/workings/:ref/commit',
    user(),
    ensureComponentCallOrPromptsEditor(),
    async (req, res) => {
      const { fullName, did: userId } = req.user!;

      const { projectId, ref } = req.params;
      if (!projectId || !ref) throw new Error('Missing required params `projectId` or `ref`');

      const input = await createBranchInputSchema.validateAsync(req.body, { stripUnknown: true });

      const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });

      const readOnly = isRefReadOnly({
        ref,
        defaultBranch: project?.gitDefaultBranch ?? defaultBranch,
        project,
        user: req.user,
      });

      if (readOnly) {
        throw new Error(`commit to read only branch ${input.branch} is forbidden`);
      }

      const author = { name: fullName, email: userId };
      const hash = await commitWorking({
        project,
        ref,
        branch: input.branch,
        message: input.message,
        author,
        skipCommitIfNoChanges: input.skipCommitIfNoChanges,
      });

      if (hash) {
        await autoSyncIfNeeded({ project, author, userId, wait: false });
      }

      return res.json({ project });
    }
  );
}
