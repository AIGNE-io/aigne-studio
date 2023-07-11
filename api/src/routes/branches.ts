import { Router } from 'express';

import { ensureComponentCallOrAdmin } from '../libs/security';
import { defaultRepository } from '../store/templates';

const router = Router();

router.get('/', ensureComponentCallOrAdmin(), async (_, res) => {
  res.json({ branches: await defaultRepository.getBranches() });
});

export default router;
