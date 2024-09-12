import { aigneRuntimeApi } from './api';

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
  return aigneRuntimeApi.get('/api/memories/by-key', { params: { projectId, key } }).then((res) => res.data);
}
