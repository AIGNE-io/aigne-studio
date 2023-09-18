import joinUrl from 'url-join';

import axios from './api';

export async function createExport({
  projectId,
  ref,
  templates,
}: {
  projectId: string;
  ref: string;
  templates: string[];
}): Promise<{ templates: any[] }> {
  return axios.post(joinUrl('/api/export', projectId, ref), { templates }).then((res) => res.data);
}

export async function getExportTemplates(): Promise<{ templates: any[] }> {
  return axios.get(joinUrl('/api/export/file')).then((res) => res.data);
}
