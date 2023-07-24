import { Tag } from '../../api/src/store/tags';
import axios from './api';

export async function getTemplateTags({
  projectId,
  offset,
  limit,
  search,
}: {
  projectId: string;
  offset?: number;
  limit?: number;
  search?: string;
}): Promise<{ tags: Tag[] }> {
  return axios.get('/api/tags', { params: { projectId, offset, limit, search } }).then((res) => res.data);
}
