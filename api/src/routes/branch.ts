import { Router } from 'express';
import Joi from 'joi';

import { ensureComponentCallOrAdmin } from '../libs/security';
import { getRepository } from '../store/projects';

export interface CreateBranchInput {
  ref: string;
  oid: string;
}

export function branchRoutes(router: Router) {
  router.get('/projects/:projectId/branches', ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    res.json({ branches: await getRepository(projectId).getBranches() });
  });

  const createBranchInputSchema = Joi.object<CreateBranchInput>({
    ref: Joi.string().required(),
    oid: Joi.string().required(),
  });

  router.post('/projects/:projectId/branches', ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const input = await createBranchInputSchema.validateAsync(req.body, { stripUnknown: true });

    const repository = getRepository(projectId);

    await repository.createBranch(input);

    res.json({ branches: await repository.getBranches() });
  });
}
