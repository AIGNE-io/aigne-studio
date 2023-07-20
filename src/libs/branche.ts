import joinUrl from 'url-join';

import { CreateBranchInput } from '../../api/src/routes/branch';
import axios from './api';

export async function getBranches({ projectId }: { projectId: string }): Promise<{ branches: string[] }> {
  return axios.get(joinUrl('/api/projects', projectId, 'branches')).then((res) => res.data);
}

export async function createBranch({
  projectId,
  input,
}: {
  projectId: string;
  input: CreateBranchInput;
}): Promise<{ branches: string[] }> {
  return axios.post(joinUrl('/api/projects', projectId, 'branches'), input).then((res) => res.data);
}
