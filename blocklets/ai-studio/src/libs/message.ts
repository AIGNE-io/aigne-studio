import axios from './api';
import { AIGNE_RUNTIME_MOUNT_POINT } from './constants';

export type History = {
  id: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
  projectRef?: string;
  agentId: string;
  sessionId: string;
  blockletDid?: string;
  inputs?: { [key: string]: any } | null;
  outputs?: {
    content?: string;
    objects?: any[];
  } | null;
  steps?: {
    id: string;
    agentId: string;
    startTime: string;
    endTime: string;
    objects?: any[];
  }[];
  error?: string;
  status?: 'generating' | 'done';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  runType?: 'cron' | 'webhook' | 'agent';
  logs?: any[];
};

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
