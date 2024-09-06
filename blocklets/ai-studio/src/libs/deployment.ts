import { joinURL } from 'ufo';

import axios from './api';
import { AIGNE_RUNTIME_MOUNT_POINT } from './constants';

type Deployment = {
  projectId: string;
  projectRef: string;
  agentId: string;
  access: 'private' | 'public';
  id: string;
};

export async function getDeploymentById({
  projectId,
  projectRef,
  agentId,
}: {
  projectId: string;
  projectRef: string;
  agentId: string;
}): Promise<{
  deployment: Deployment;
}> {
  return axios
    .get('/api/deployment/byId', { baseURL: AIGNE_RUNTIME_MOUNT_POINT, params: { projectId, projectRef, agentId } })
    .then((res) => res.data);
}

export async function getDeployment({ id }: { id: string }): Promise<{
  deployment: Deployment;
}> {
  return axios.get(joinURL('/api/deployment', id), { baseURL: AIGNE_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function createOrUpdateDeployment(input: {
  projectId: string;
  projectRef: string;
  agentId: string;
  access?: 'private' | 'public';
}): Promise<{ deployment: Deployment }> {
  return axios.post('/api/deployment', input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function getDeployments(input: {
  projectId: string;
  projectRef: string;
  page: number;
  pageSize: number;
}): Promise<{
  deployments: Deployment[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}> {
  return axios.get('/api/deployment', { baseURL: AIGNE_RUNTIME_MOUNT_POINT, params: input }).then((res) => res.data);
}

export async function updateDeployment(
  id: string,
  input: {
    access?: 'private' | 'public';
  }
): Promise<{ deployment: Deployment }> {
  return axios
    .put(joinURL('/api/deployment', id), input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function deleteDeployment(input: { id: string }): Promise<{ deployment: Deployment }> {
  return axios
    .delete(joinURL('/api/deployment', input.id), { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}
