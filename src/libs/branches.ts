import axios from './api';

export async function getBranches(): Promise<{ branches: string[] }> {
  return axios.get('/api/branches').then((res) => res.data);
}
