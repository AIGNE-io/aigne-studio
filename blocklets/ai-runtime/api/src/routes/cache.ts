import { getAgent } from '@api/libs/agent';
import ExecutionCache from '@api/store/models/execution-cache';
import { parseIdentity } from '@blocklet/ai-runtime/common/aid';
import middlewares from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';

import checkUserAuth from '../libs/user-auth';

const router = Router();

router.delete('/agents/:aid/cache', middlewares.session(), async (req, res) => {
  const { aid } = req.params;
  if (!aid) throw new Error('Missing required param `aid`');

  const { projectId, agentId } = parseIdentity(aid, { rejectWhenError: true });

  const agent = await getAgent({ aid, working: true, rejectOnEmpty: true });

  checkUserAuth(req, res)({ userId: agent.createdBy });

  const deleted = await ExecutionCache.destroy({ where: { projectId, agentId } });

  res.json({ deleted });
});

export default router;
