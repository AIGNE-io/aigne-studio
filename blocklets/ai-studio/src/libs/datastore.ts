import Datastore from '@api/store/models/datastore';

import axios from './api';

export async function getVariables({
  scope,
  projectId,
  offset,
  limit,
}: {
  scope: string;
  projectId: string;
  offset: number;
  limit: number;
}): Promise<{ list: Datastore[]; count: number }> {
  return axios
    .get('/api/datastore/all-variables', { params: { projectId, scope, offset, limit } })
    .then((res) => res.data);
}

export async function getVariable({
  type,
  scope,
  projectId,
  offset,
  limit,
}: {
  type: string;
  scope: string;
  projectId: string;
  offset: number;
  limit: number;
}): Promise<{ list: Datastore[] }> {
  return axios
    .get('/api/datastore/all-variable', { params: { type, projectId, scope, offset, limit } })
    .then((res) => res.data);
}
