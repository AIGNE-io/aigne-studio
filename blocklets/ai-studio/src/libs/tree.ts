import { joinURL } from 'ufo';

import type { EntryWithMeta } from '../../api/src/routes/tree';
import axios from './api';

export async function getTree({
  projectId,
  ref,
}: {
  projectId: string;
  ref: string;
}): Promise<{ files: EntryWithMeta[] }> {
  return axios.get(joinURL('/api/projects', projectId, 'tree', ref || '')).then((res) => res.data);
}
