import { Tag } from '../../api/src/store/tags';
import axios from './api';

export async function getTags({
  offset,
  limit,
  search,
}: {
  offset?: number;
  limit?: number;
  search?: string;
} = {}): Promise<{ tags: Tag[] }> {
  return axios.get('/api/tags', { params: { offset, limit, search } }).then((res) => res.data);
}
