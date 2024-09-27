import { joinURL } from 'ufo';

import { aigneRuntimeApi } from './api';

export interface GetCronHistoriesQuery {
  blockletDid?: string;
  projectId: string;
  projectRef?: string;
  agentId?: string;
  cronJobId?: string;
  page: number;
  limit: number;
}

export interface CronHistory {
  id: string;
  createdAt: string;
  updatedAt: string;
  blockletDid?: string;
  projectId: string;
  projectRef?: string;
  agentId: string;
  cronJobId: string;
  inputs?: { [key: string]: any };
  outputs?: { [key: string]: any };
  startTime: string;
  endTime: string;
  error?: { message: string };
}

export async function getCronHistories(query: GetCronHistoriesQuery): Promise<{ list: CronHistory[]; count: number }> {
  return aigneRuntimeApi.get(joinURL('/api/cron-histories'), { params: query }).then((res) => res.data);
}
