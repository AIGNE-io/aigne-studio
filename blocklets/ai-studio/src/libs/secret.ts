import axios from './api';
import { AI_RUNTIME_MOUNT_POINT } from './constants';

export interface Secret {
  id: string;
  projectId: string;
  targetProjectId: string;
  targetAgentId: string;
  targetInputKey: string;
}

export async function getSecrets({
  projectId,
  targetProjectId,
  targetAgentId,
}: {
  projectId: string;
  targetProjectId: string;
  targetAgentId: string;
}): Promise<{ secrets: Secret[] }> {
  return axios
    .get('/api/secrets/has-value', {
      baseURL: AI_RUNTIME_MOUNT_POINT,
      params: { projectId, targetProjectId, targetAgentId },
    })
    .then((res) => res.data);
}

export interface CreateOrUpdateSecretsInput {
  secrets: {
    targetProjectId: string;
    targetAgentId: string;
    targetInputKey: string;
    secret: string;
  }[];
}

export async function createOrUpdateSecrets({ input }: { input: CreateOrUpdateSecretsInput }): Promise<{}> {
  return axios.post('/api/secrets', input, { baseURL: AI_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}
