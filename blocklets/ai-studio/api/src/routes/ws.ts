import { user } from '@blocklet/sdk/lib/middlewares';
import express from 'express';

import { ensurePromptsEditor, isRefReadOnly } from '../libs/security';
import Project from '../store/models/project';
import { defaultBranch, getRepository } from '../store/repository';

const router = express.Router();

export default router;

router.use(ensurePromptsEditor, user()).ws('/ws/:projectId/:ref', async (conn, req) => {
  const { projectId, ref } = req.params;
  if (!projectId || !ref) throw new Error('Missing required params projectId or ref');

  const { role } = req.user!;

  const project = await Project.findOne({ where: { _id: projectId } });

  if (!project) {
    conn.close(3001, `Project ${projectId} not found`);
    return;
  }

  const readOnly = isRefReadOnly({ ref, role, defaultBranch: project?.gitDefaultBranch ?? defaultBranch });

  const repository = await getRepository({ projectId });
  const working = await repository.working({ ref });
  working.addConnection(conn, { readOnly });
});
