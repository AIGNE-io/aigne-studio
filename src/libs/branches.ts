import { CreateBranchInput } from '../../api/src/routes/branches';
import axios from './api';

export async function getBranches(): Promise<{ branches: string[] }> {
  return axios.get('/api/branches').then((res) => res.data);
}

export async function createBranch(input: CreateBranchInput): Promise<{ branches: string[] }> {
  return axios.post('/api/branches', input).then((res) => res.data);
}
