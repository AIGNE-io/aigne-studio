import { call } from '@blocklet/ai-runtime/utils/call';

import { AIGNE_RUNTIME_COMPONENT_DID } from '../../constants';

export interface CreateCronHistoryInput {
  projectId: string;
  projectRef?: string;
  agentId: string;
  cronJobId: string;
  inputs: { [key: string]: any };
  outputs?: { [key: string]: any };
  startTime: string;
  endTime: string;
  error?: { message: string };
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
  inputs: { [key: string]: any };
  outputs?: { [key: string]: any };
  startTime: string;
  endTime: string;
  error?: { message: string };
}

export async function createCronHistory(input: CreateCronHistoryInput): Promise<CronHistory> {
  return call({
    name: AIGNE_RUNTIME_COMPONENT_DID,
    path: '/api/cron-histories',
    data: input,
  }).then((res) => res.data);
}
