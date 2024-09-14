import ws from 'ws';

import { isRefReadOnly } from '../libs/security';
import Project from '../store/models/project';
import { defaultBranch, getRepository } from '../store/repository';

export const wss = new ws.Server({ noServer: true });

wss.on('connection', async (conn, req: any) => {
  const { projectId, ref } = req.url.match(/\/api\/ws\/(?<projectId>\w+)\/(?<ref>\w+)/)?.groups ?? {};
  if (!projectId || !ref) throw new Error('Missing required params projectId or ref');

  const project = await Project.findOne({ where: { id: projectId } });

  if (!project) {
    conn.close(3001, `Project ${projectId} not found`);
    return;
  }

  const did = req.headers['x-user-did']?.toString();
  const role = req.headers['x-user-role']?.toString();

  const readOnly = isRefReadOnly({
    ref,
    defaultBranch: project?.gitDefaultBranch ?? defaultBranch,
    project,
    user: { did, role },
  });

  const repository = await getRepository({ projectId });
  const working = await repository.working({ ref });
  working.addConnection(conn, { readOnly });
});
