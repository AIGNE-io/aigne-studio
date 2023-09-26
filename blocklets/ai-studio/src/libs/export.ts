import joinUrl from 'url-join';

import { Template } from '../../api/src/store/templates';
import axios from './api';

export async function createExport({
  projectId,
  ref,
  templates,
  resource,
}: {
  projectId: string;
  ref: string;
  templates: string[];
  resource: {
    projectId: string;
    releaseId: string;
  };
}): Promise<{ templates: Template[] }> {
  return axios
    .post(joinUrl('/api/export', projectId, ref), {
      templates,
      projectId: resource.projectId,
      releaseId: resource.releaseId,
    })
    .then((res) => res.data);
}

export async function getExportTemplates({
  projectId,
  releaseId,
}: {
  projectId: string;
  releaseId: string;
}): Promise<{ templates: Template[]; projectId: string; ref: string }> {
  return axios
    .get(joinUrl('/api/export/file'), {
      params: {
        projectId,
        releaseId,
      },
    })
    .then((res) => res.data);
}
