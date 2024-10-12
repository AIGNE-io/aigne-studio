import { getAgent } from '@api/libs/agent';
import ExecutionCache from '@api/store/models/execution-cache';
import { parseIdentity } from '@blocklet/ai-runtime/common/aid';
import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';

import checkUserAuth from '../libs/user-auth';

const router = Router();

router.delete('/agents/:aid/cache', user(), async (req, res) => {
  const { aid } = req.params;

  if (!aid) throw new Error('Missing required param `aid`');

  const { projectId, agentId } = parseIdentity(aid, { rejectWhenError: true });

  const cache = await ExecutionCache.findOne({ where: { projectId, agentId } });
  if (cache) {
    const agent = await getAgent({
      projectId,
      agentId,
      projectRef: cache.projectRef,
      working: true,
      rejectOnEmpty: true,
    });

    checkUserAuth(req, res)({ userId: agent.createdBy });
  }

  const deleted = await ExecutionCache.destroy({ where: { projectId, agentId } });
  res.json({ deleted });
});

export default router;
