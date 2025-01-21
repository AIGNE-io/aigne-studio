import type { IncomingMessage, Server } from 'http';

import { Config } from '@api/libs/env';
import logger from '@api/libs/logger';
import { verifyLoginToken } from '@blocklet/sdk/lib/util/verify-session';
import ws from 'ws';

import { isRefReadOnly } from '../libs/security';
import Project from '../store/models/project';
import { defaultBranch, getRepository } from '../store/repository';

const wss = new ws.Server({ noServer: true });

wss.on('connection', async (conn, req: any) => {
  const { projectId, ref } = req.url.match(/\/api\/ws\/(?<projectId>\w+)\/(?<ref>\w+)/)?.groups ?? {};
  if (!projectId || !ref) throw new Error('Missing required params projectId or ref');

  const project = await Project.findOne({ where: { id: projectId } });

  if (!project) {
    conn.close(3001, `Project ${projectId} not found`);
    return;
  }

  const user = await verifyWSToken(req, Config.serviceModePermissionMap.ensurePromptsEditorRoles);
  if (!user) {
    conn.close(3001, 'You are not allowed to access this project');
    return;
  }

  const readOnly = isRefReadOnly({
    ref,
    defaultBranch: project?.gitDefaultBranch ?? defaultBranch,
    project,
    user,
  });

  const repository = await getRepository({ projectId });
  const working = await repository.working({ ref });
  working.addConnection(conn, { readOnly });
});

export function handleYjsWebSocketUpgrade(server: Server) {
  server.on('upgrade', async (req, socket, head) => {
    if (req.url?.match(/^\/api\/ws/)) {
      if (!(await verifyWSToken(req, Config.serviceModePermissionMap.ensurePromptsEditorRoles))) {
        logger.error('handle socket upgrade forbidden', { url: req.url });

        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });
}

async function verifyWSToken(req: IncomingMessage, roles: string[] | undefined) {
  const token = req.headers.cookie?.match('login_token=(?<token>[^;]+)')?.groups?.token;
  if (typeof token !== 'string') return false;

  try {
    const user = await verifyLoginToken({ token, strictMode: true });
    if (!user) return false;

    if (!user.did || (roles && !roles.includes(user.role!))) return false;

    return user;
  } catch (error) {
    logger.error('verify ws token error', { error });
  }
  return false;
}
