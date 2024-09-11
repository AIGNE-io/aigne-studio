import { joinURL } from 'ufo';

import axios from './api';
import { AIGNE_RUNTIME_MOUNT_POINT } from './constants';

export type Deployment = {
  id: string;
  createdBy: string;
  updatedBy: string;
  projectId: string;
  projectRef: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
  access: 'public' | 'private';
  categories: string[];
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

export async function getDeployment({ id }: { id: string }): Promise<Deployment> {
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

export async function getDeploymentsByCategoryId(input: {
  categoryId: string;
  page: number;
  pageSize: number;
}): Promise<{
  list: Deployment[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}> {
  const { categoryId, page, pageSize } = input;
  return axios
    .get(`/api/deployment/categories/${categoryId}`, {
      baseURL: AIGNE_RUNTIME_MOUNT_POINT,
      params: {
        page,
        pageSize,
      },
    })
    .then((res) => res.data);
}

export async function getAllDeployments(input: { page: number; pageSize: number }): Promise<{
  deployments: Deployment[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}> {
  return axios
    .get('/api/deployment/list', { baseURL: AIGNE_RUNTIME_MOUNT_POINT, params: input })
    .then((res) => res.data);
}

export async function updateDeployment(
  id: string,
  input: {
    access?: 'private' | 'public';
    categories: string[];
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
