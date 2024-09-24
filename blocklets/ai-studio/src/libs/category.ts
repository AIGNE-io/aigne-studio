import axios from './api';

export type Category = {
  id: string;
  name: string;
  icon: string;
};

export async function createCategory(input: { name: string; icon: string }): Promise<Category> {
  return axios.post('/api/categories', input).then((res) => res.data);
}

export async function getCategories(input: { page: number; pageSize: number }): Promise<{
  list: Category[];
  totalCount: number;
}> {
  return axios.get('/api/categories', { params: input }).then((res) => res.data);
}

export async function updateCategory(id: string, input: { name: string; icon: string }): Promise<Category> {
  return axios.put(`/api/categories/${id}`, input).then((res) => res.data);
}

export async function deleteCategory(id: string): Promise<{}> {
  return axios.delete(`/api/categories/${id}`).then((res) => res.data);
}
