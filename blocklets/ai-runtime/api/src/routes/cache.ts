import { ensureComponentCallOrAdmin } from '@api/libs/security';
import ExecutionCache from '@api/store/models/execution-cache';
import { parseIdentity } from '@blocklet/ai-runtime/common/aid';
import { Router } from 'express';

const router = Router();

router.delete('/agents/:aid/cache', ensureComponentCallOrAdmin(), async (req, res) => {
  const { aid } = req.params;
  if (!aid) throw new Error('Missing required param `aid`');

  const { projectId, agentId } = parseIdentity(aid, { rejectWhenError: true });

  const deleted = await ExecutionCache.destroy({ where: { projectId, agentId } });

  res.json({ deleted });
});

export default router;
