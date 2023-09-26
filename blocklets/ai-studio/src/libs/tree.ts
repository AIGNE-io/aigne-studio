import joinUrl from 'url-join';

import { EntryWithMeta } from '../../api/src/routes/tree';
import { Template } from '../../api/src/store/templates';
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
