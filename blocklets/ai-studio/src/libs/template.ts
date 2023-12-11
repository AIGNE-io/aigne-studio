import { Template } from 'api/src/store/0.1.157/templates';

import axios from './api';

export async function getTemplate(projectId: string, ref: string, templateId: string): Promise<Template> {
  return axios.get(`/api/templates/${templateId}`, { params: { projectId, hash: ref } }).then((res) => res.data);
}
