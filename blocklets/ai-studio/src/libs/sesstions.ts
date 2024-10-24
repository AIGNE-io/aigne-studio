import { joinURL } from 'ufo';

import axios from './api';
import { AIGNE_RUNTIME_MOUNT_POINT } from './constants';

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  name?: string;
  userId?: string;
  projectId: string;
  agentId: string;
}

export async function getSessions({ aid }: { aid: string }): Promise<{ sessions: Session[] }> {
  return axios.get('/api/sessions', { baseURL: AIGNE_RUNTIME_MOUNT_POINT, params: { aid } }).then((res) => res.data);
}

export async function getSession({ sessionId }: { sessionId: string }): Promise<{ session: Session }> {
  return axios.get(joinURL('/api/sessions', sessionId), { baseURL: AIGNE_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function createSession({
  aid,
  name,
}: {
  aid: string;
  name?: string;
}): Promise<{ created: Session; sessions: Session[] }> {
  return axios.post('/api/sessions', { aid, name }, { baseURL: AIGNE_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function clearSession({ sessionId }: { sessionId: string }): Promise<{}> {
  return axios
    .post(joinURL('/api/sessions', sessionId, '/clear'), { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function updateSession({
  sessionId,
  name,
}: {
  sessionId: string;
  name?: string;
}): Promise<{ updated: Session; sessions: Session[] }> {
  return axios
    .patch(joinURL('/api/sessions', sessionId), { name }, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function deleteSession({
  sessionId,
}: {
  sessionId: string;
}): Promise<{ deleted: Session; sessions: Session[] }> {
  return axios
    .delete(joinURL('/api/sessions', sessionId), { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}
