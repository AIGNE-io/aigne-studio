import Project from '@api/store/models/project';
import type { Router } from 'express';
import Joi from 'joi';

import { ensureComponentCallOrPromptsEditor } from '../libs/security';
import { getRepository } from '../store/repository';

export interface CreateBranchInput {
  name: string;
  oid: string;
}

export function branchRoutes(router: Router) {
  router.get('/projects/:projectId/branches', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const repository = await getRepository({ projectId });

    res.json({ branches: await repository.listBranches() });
  });

  const createBranchInputSchema = Joi.object<CreateBranchInput>({
    name: Joi.string().required(),
    oid: Joi.string().required(),
  });

  router.post('/projects/:projectId/branches', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const input = await createBranchInputSchema.validateAsync(req.body, { stripUnknown: true });

    const repository = await getRepository({ projectId });

    await repository.branch({ ref: input.name, object: input.oid });

    res.json({ branches: await repository.listBranches() });
  });

  const updateBranchInputSchema = Joi.object<{ name: string }>({
    name: Joi.string().required(),
  });

  router.put('/projects/:projectId/branches/:branch', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId, branch } = req.params;

    if (!projectId || !branch) throw new Error('Missing required params `projectId` or `branch`');

    const input = await updateBranchInputSchema.validateAsync(req.body, { stripUnknown: true });

    const repository = await getRepository({ projectId });

    await repository.renameBranch({ ref: input.name, oldRef: branch });

    res.json({ branches: await repository.listBranches() });
  });

  router.delete('/projects/:projectId/branches/:branch', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId, branch } = req.params;
    if (!projectId || !branch) throw new Error('Missing required params `projectId` or `branch`');

    const defaultBranch = (await Project.findOne({ where: { id: projectId } }))?.gitDefaultBranch;

    if (branch === defaultBranch) throw new Error('Can not delete default branch');

    const repository = await getRepository({ projectId });

    await repository.deleteBranch({ ref: branch });

    res.json({ branches: await repository.listBranches() });
  });
}
