import axios from './api';
import { AIGNE_RUNTIME_MOUNT_POINT } from './constants';

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
  targetBlockletDid,
}: {
  projectId: string;
  targetProjectId: string;
  targetAgentId: string;
  targetBlockletDid?: string;
}): Promise<{ secrets: Secret[]; globalAuthorized: boolean }> {
  return axios
    .get('/api/secrets/has-value', {
      baseURL: AIGNE_RUNTIME_MOUNT_POINT,
      params: { projectId, targetProjectId, targetAgentId, targetBlockletDid },
    })
    .then((res) => res.data);
}

export async function getHasCrawlSecret(): Promise<{ jina: boolean; firecrawl: boolean }> {
  return axios.get('/api/secrets/has-crawl-secret', { baseURL: AIGNE_RUNTIME_MOUNT_POINT }).then((res) => res.data);
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
  return axios.post('/api/secrets', input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}
