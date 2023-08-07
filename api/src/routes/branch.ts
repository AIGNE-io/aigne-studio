import { Router } from 'express';
import Joi from 'joi';

import { ensureComponentCallOrPromptsEditor } from '../libs/security';
import { getRepository } from '../store/projects';
import { defaultBranch } from '../store/repository';

export interface CreateBranchInput {
  name: string;
  oid: string;
}

export function branchRoutes(router: Router) {
  router.get('/projects/:projectId/branches', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    res.json({ branches: await getRepository(projectId).getBranches() });
  });

  const createBranchInputSchema = Joi.object<CreateBranchInput>({
    name: Joi.string().required(),
    oid: Joi.string().required(),
  });

  router.post('/projects/:projectId/branches', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const input = await createBranchInputSchema.validateAsync(req.body, { stripUnknown: true });

    const repository = getRepository(projectId);

    await repository.createBranch({ ref: input.name, oid: input.oid });

    res.json({ branches: await repository.getBranches() });
  });

  const updateBranchInputSchema = Joi.object<{ name: string }>({
    name: Joi.string().required(),
  });

  router.put('/projects/:projectId/branches/:branch', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId, branch } = req.params;
    if (!projectId || !branch) throw new Error('Missing required params `projectId` or `branch`');
    if (branch === defaultBranch) throw new Error('Can not rename default branch');

    const input = await updateBranchInputSchema.validateAsync(req.body, { stripUnknown: true });

    const repository = getRepository(projectId);

    await repository.renameBranch({ ref: input.name, oldRef: branch });

    res.json({ branches: await repository.getBranches() });
  });

  router.delete('/projects/:projectId/branches/:branch', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId, branch } = req.params;
    if (!projectId || !branch) throw new Error('Missing required params `projectId` or `branch`');

    if (branch === defaultBranch) throw new Error('Can not delete default branch');

    const repository = getRepository(projectId);

    await repository.deleteBranch({ ref: branch });

    res.json({ branches: await repository.getBranches() });
  });
}
