import { TemplateYjs } from '../../api/src/store/projects';
import { Template } from '../../api/src/store/templates';
import axios from './api';

export function isTemplateEmpty(template: Template) {
  if (template.branch?.branches.some((i) => !!i.template)) {
    return false;
  }
  if (template.prompts?.some((i) => i.content?.trim())) {
    return false;
  }
  return true;
}

export function isTemplateYjsEmpty(template: TemplateYjs) {
  if (Object.keys(template.branch?.branches ?? {}).length) {
    return false;
  }
  if (Object.keys(template.prompts ?? {}).length) {
    return false;
  }
  return true;
}

export async function getTemplates(projectId: string, ref: string): Promise<{ templates: Template[] }> {
  return axios.get('/api/templates', { params: { projectId, ref } }).then((res) => res.data);
}

export async function getTemplate(projectId: string, ref: string, templateId: string): Promise<Template> {
  return axios.get(`/api/templates/${templateId}`, { params: { projectId, ref } }).then((res) => res.data);
}
