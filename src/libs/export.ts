import joinUrl from 'url-join';

import axios from './api';

export async function createExport({
  projectId,
  ref,
  templates,
  iframe,
}: {
  projectId: string;
  ref: string;
  templates: string[];
  iframe: {
    projectId: string;
    releaseId: string;
  };
}): Promise<{ templates: any[] }> {
  return axios
    .post(joinUrl('/api/export', projectId, ref), {
      templates,
      projectId: iframe.projectId,
      releaseId: iframe.releaseId,
    })
    .then((res) => res.data);
}

export async function getExportTemplates({
  projectId,
  releaseId,
}: {
  projectId: string;
  releaseId: string;
}): Promise<{ templates: any[] }> {
  return axios
    .get(joinUrl('/api/export/file'), {
      params: {
        projectId,
        releaseId,
      },
    })
    .then((res) => res.data);
}
