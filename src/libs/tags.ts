import { Tag } from '../../api/src/store/tags';
import axios from './api';

export async function getTags({
  offset,
  limit,
}: {
  offset?: number;
  limit?: number;
} = {}): Promise<{ tags: Tag[] }> {
  return axios.get('/api/tags', { params: { offset, limit } }).then((res) => res.data);
}
