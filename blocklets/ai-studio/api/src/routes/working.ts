import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';

import { ensureComponentCallOrPromptsEditor, isRefReadOnly } from '../libs/security';
import { getRepository } from '../store/projects';

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

      const repository = await getRepository({ projectId });
      const working = await repository.working({ ref });
      await working.commit({
        ref,
        branch: input.branch,
        message: input.message,
        author: { name: fullName, email: userId },
      });

      res.json({});
    }
  );
}
