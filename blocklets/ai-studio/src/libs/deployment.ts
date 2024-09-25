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
  categories: { id: string; name: string; slug: string }[];
  productHuntUrl?: string;
  productHuntBannerUrl?: string;
};

export type UpdateType = {
  access: 'private' | 'public';
  categories: string[];
  productHuntUrl?: string;
  productHuntBannerUrl?: string;
};

export async function getDeploymentByProjectId({
  projectId,
  projectRef,
}: {
  projectId: string;
  projectRef: string;
}): Promise<Deployment | null> {
  return axios.get('/api/deployments/byProjectId', { params: { projectId, projectRef } }).then((res) => res.data);
}

export async function getDeployment({ id }: { id: string }): Promise<{ deployment: Deployment | null }> {
  return axios.get(joinURL('/api/deployments', id)).then((res) => res.data);
}

export async function createDeployment(input: {
  projectId: string;
  projectRef: string;
  access?: 'private' | 'public';
}): Promise<Deployment> {
  return axios.post('/api/deployments', input).then((res) => res.data);
}

export async function getDeploymentsByCategorySlug(input: {
  categorySlug: string;
  page: number;
  pageSize: number;
}): Promise<{
  list: Deployment[];
  totalCount: number;
}> {
  const { categorySlug, page, pageSize } = input;
  return axios
    .get(`/api/deployments/categories/${categorySlug}`, { params: { page, pageSize } })
    .then((res) => res.data);
}

export async function getDeployments(input: { page: number; pageSize: number }): Promise<{
  list: Deployment[];
  totalCount: number;
}> {
  return axios.get('/api/deployments', { params: input }).then((res) => res.data);
}

export async function updateDeployment(id: string, input: UpdateType): Promise<Deployment> {
  return axios.put(joinURL('/api/deployments', id), input).then((res) => res.data);
}

export async function deleteDeployment(input: { id: string }): Promise<Deployment> {
  return axios.delete(joinURL('/api/deployments', input.id)).then((res) => res.data);
}
