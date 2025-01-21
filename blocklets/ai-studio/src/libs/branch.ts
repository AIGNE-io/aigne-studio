import { joinURL } from 'ufo';

import type { CreateBranchInput } from '../../api/src/routes/branch';
import axios from './api';

export async function getBranches({ projectId }: { projectId: string }): Promise<{ branches: string[] }> {
  return axios.get(joinURL('/api/projects', projectId, 'branches')).then((res) => res.data);
}

export async function createBranch({
  projectId,
  input,
}: {
  projectId: string;
  input: CreateBranchInput;
}): Promise<{ branches: string[] }> {
  return axios.post(joinURL('/api/projects', projectId, 'branches'), input).then((res) => res.data);
}

export async function updateBranch({
  projectId,
  branch,
  input,
}: {
  projectId: string;
  branch: string;
  input: { name: string };
}): Promise<{ branches: string[] }> {
  return axios.put(joinURL('/api/projects', projectId, 'branches', branch), input).then((res) => res.data);
}

export async function deleteBranch({
  projectId,
  branch,
}: {
  projectId: string;
  branch: string;
}): Promise<{ branches: string[] }> {
  return axios.delete(joinURL('/api/projects', projectId, 'branches', branch)).then((res) => res.data);
}
