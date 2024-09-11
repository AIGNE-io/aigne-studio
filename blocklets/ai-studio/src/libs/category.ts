import axios from './api';
import { AIGNE_RUNTIME_MOUNT_POINT } from './constants';

export type Category = {
  id: string;
  name: string;
  icon: string;
};

export async function createCategory(input: { name: string; icon: string }): Promise<{ category: Category }> {
  return axios.post('/api/category', input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function getCategories(input: { page: number; pageSize: number }): Promise<{
  list: Category[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}> {
  return axios.get('/api/category', { baseURL: AIGNE_RUNTIME_MOUNT_POINT, params: input }).then((res) => res.data);
}

export async function updateCategory(
  id: string,
  input: { name: string; icon: string }
): Promise<{ category: Category }> {
  return axios.put(`/api/category/${id}`, input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function deleteCategory(id: string): Promise<{ category: Category }> {
  return axios.delete(`/api/category/${id}`, { baseURL: AIGNE_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}
