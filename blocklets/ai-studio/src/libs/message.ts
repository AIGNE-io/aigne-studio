import History from '../../api/src/store/models/history';
import axios from './api';
import { AIGNE_RUNTIME_MOUNT_POINT } from './constants';

export async function getLogHistories({
  projectId,
  sessionId,
  agentId,
  date,
  page,
  size,
}: {
  projectId: string;
  sessionId: string | null;
  agentId: string | null;
  date: string | null;
  page: number;
  size: number;
}): Promise<{
  messages: History[];
  total: number;
  page: number;
}> {
  return axios
    .get('/api/history', {
      baseURL: AIGNE_RUNTIME_MOUNT_POINT,
      params: { projectId, sessionId, agentId, date, page, size },
    })
    .then((res) => res.data);
}
