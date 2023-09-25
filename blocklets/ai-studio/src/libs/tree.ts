import joinUrl from 'url-join';

import { Template } from '../../api/src/store/templates';
import axios from './api';

export async function getFile({
  projectId,
  ref,
  path,
}: {
  projectId: string;
  ref: string;
  path: string;
}): Promise<Template> {
  return axios.get(joinUrl('/api/projects', projectId, 'tree', ref || '', path)).then((res) => res.data);
}
