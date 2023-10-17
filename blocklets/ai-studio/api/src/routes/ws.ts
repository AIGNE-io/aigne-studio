import { user } from '@blocklet/sdk/lib/middlewares';
import express from 'express';

import { ensurePromptsEditor, isRefReadOnly } from '../libs/security';
import { getRepository, projects } from '../store/projects';

const router = express.Router();

export default router;

router.use(ensurePromptsEditor, user()).ws('/ws/:projectId/:ref', async (conn, req) => {
  const { projectId, ref } = req.params;
  if (!projectId || !ref) throw new Error('Missing required params projectId or ref');

  const { role } = req.user!;
  const readOnly = isRefReadOnly({ ref, role });

  const project = await projects.findOne({ _id: projectId });
  if (!project) {
    conn.close(3001, `Project ${projectId} not found`);
    return;
  }

  const repository = await getRepository({ projectId });
  const working = await repository.working({ ref });
  working.addConnection(conn, { readOnly });
});
