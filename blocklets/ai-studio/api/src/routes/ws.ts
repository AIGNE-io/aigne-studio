import express from 'express';

import { ensurePromptsEditor } from '../libs/security';
import { getRepository } from '../store/projects';

const router = express.Router();

export default router;

router.use(ensurePromptsEditor).ws('/ws/:projectId/:ref', async (conn, req) => {
  const { projectId, ref } = req.params;
  if (!projectId || !ref) throw new Error('Missing required params projectId or ref');

  const repository = await getRepository({ projectId });
  const working = await repository.working({ ref });
  working.addConnection(conn);
});
