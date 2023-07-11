import { Router } from 'express';
import Joi from 'joi';

import { ensureComponentCallOrAdmin } from '../libs/security';
import { defaultRepository } from '../store/templates';

const router = Router();

router.get('/', ensureComponentCallOrAdmin(), async (_, res) => {
  res.json({ branches: await defaultRepository.getBranches() });
});

export interface CreateBranchInput {
  ref: string;
  oid: string;
}

const createBranchInputSchema = Joi.object<CreateBranchInput>({
  ref: Joi.string().required(),
  oid: Joi.string().required(),
});

router.post('/', ensureComponentCallOrAdmin(), async (req, res) => {
  const input = await createBranchInputSchema.validateAsync(req.body, { stripUnknown: true });

  await defaultRepository.createBranch(input);

  res.json({ branches: await defaultRepository.getBranches() });
});

export default router;
