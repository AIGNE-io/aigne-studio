import { joinURL } from 'ufo';

import axios from './api';

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
}): Promise<Deployment> {
  return axios.get('/api/deployments/byId', { params: { projectId, projectRef, agentId } }).then((res) => res.data);
}

export async function getDeployment({ id }: { id: string }): Promise<Deployment> {
  return axios.get(joinURL('/api/deployments', id)).then((res) => res.data);
}

export async function createOrUpdateDeployment(input: {
  projectId: string;
  projectRef: string;
  agentId: string;
  access?: 'private' | 'public';
}): Promise<Deployment> {
  return axios.post('/api/deployments', input).then((res) => res.data);
}

export async function getDeployments(input: {
  projectId: string;
  projectRef: string;
  page: number;
  pageSize: number;
}): Promise<{
  list: Deployment[];
  totalCount: number;
  currentPage: number;
}> {
  return axios.get('/api/deployments', { params: input }).then((res) => res.data);
}

export async function getDeploymentsByCategoryId(input: {
  categoryId: string;
  page: number;
  pageSize: number;
}): Promise<{
  list: Deployment[];
  totalCount: number;
  currentPage: number;
}> {
  const { categoryId, page, pageSize } = input;
  return axios.get(`/api/deployments/categories/${categoryId}`, { params: { page, pageSize } }).then((res) => res.data);
}

export async function getAllDeployments(input: { page: number; pageSize: number }): Promise<{
  list: Deployment[];
  totalCount: number;
  currentPage: number;
}> {
  return axios.get('/api/deployments/list', { params: input }).then((res) => res.data);
}

export async function updateDeployment(
  id: string,
  input: {
    access?: 'private' | 'public';
    categories?: string[];
  }
): Promise<Deployment> {
  return axios.put(joinURL('/api/deployments', id), input).then((res) => res.data);
}

export async function deleteDeployment(input: { id: string }): Promise<Deployment> {
  return axios.delete(joinURL('/api/deployments', input.id)).then((res) => res.data);
}
