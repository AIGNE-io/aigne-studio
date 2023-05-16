import { TemplateInput } from '../../api/src/routes/templates';
import { Template } from '../../api/src/store/templates';
import axios from './api';

export async function getTemplates({
  offset,
  limit,
  sort,
  search,
}: {
  offset?: number;
  limit?: number;
  sort?: string;
  search?: string;
} = {}): Promise<{ templates: Template[] }> {
  return axios.get('/api/templates', { params: { offset, limit, sort, search } }).then((res) => res.data);
}

export async function getTemplate(templateId: string): Promise<Template> {
  return axios.get(`/api/templates/${templateId}`).then((res) => res.data);
}

export async function createTemplate(template: TemplateInput): Promise<Template> {
  return axios.post('/api/templates', template).then((res) => res.data);
}

export async function updateTemplate(templateId: string, template: TemplateInput): Promise<Template> {
  return axios.put(`/api/templates/${templateId}`, template).then((res) => res.data);
}

export async function deleteTemplate(templateId: string): Promise<Template> {
  return axios.delete(`/api/templates/${templateId}`).then((res) => res.data);
}

export function isTemplateEmpty(template: Template) {
  if (template.branch?.branches.some((i) => !!i.template)) {
    return false;
  }
  if (template.prompts?.some((i) => i.content?.trim())) {
    return false;
  }
  return true;
}
