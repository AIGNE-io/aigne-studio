import { joinURL as joinUrl } from 'ufo';

import { EntryWithMeta } from '../../api/src/routes/tree';
import axios from './api';

export async function getTree({
  projectId,
  ref,
}: {
  projectId: string;
  ref: string;
}): Promise<{ files: EntryWithMeta[] }> {
  return axios.get(joinUrl('/api/projects', projectId, 'tree', ref || '')).then((res) => res.data);
}
