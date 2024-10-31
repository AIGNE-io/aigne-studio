import { call } from '@blocklet/ai-runtime/utils/call';

import { AIGNE_RUNTIME_COMPONENT_DID } from '../../constants';

export interface Memory {
  id: string;
  key: string;
  data: any;
}

export async function getMemoryByKey({
  projectId,
  key,
}: {
  projectId: string;
  key: string;
}): Promise<{ memories: Memory[] }> {
  return call({
    name: AIGNE_RUNTIME_COMPONENT_DID,
    method: 'GET',
    path: '/api/memories/by-key',
    params: { projectId, key },
  }).then((res) => res.data);
}
