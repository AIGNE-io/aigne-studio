import axios from './api';

type CategoryInput = {
  name: string;
  icon: string;
  slug: string;
};

export type Category = { id: string } & CategoryInput;

export async function createCategory(input: CategoryInput): Promise<Category> {
  return axios.post('/api/categories', input).then((res) => res.data);
}

export async function getCategories(input: { page: number; pageSize: number }): Promise<{
  list: Category[];
  totalCount: number;
}> {
  return axios.get('/api/categories', { params: input }).then((res) => res.data);
}

export async function updateCategory(id: string, input: CategoryInput): Promise<Category> {
  return axios.put(`/api/categories/${id}`, input).then((res) => res.data);
}

export async function deleteCategory(id: string): Promise<{}> {
  return axios.delete(`/api/categories/${id}`).then((res) => res.data);
}
