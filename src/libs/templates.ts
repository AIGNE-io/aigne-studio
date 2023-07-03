import { ReadCommitResult } from 'isomorphic-git';

import { TemplateInput } from '../../api/src/routes/templates';
import { Template } from '../../api/src/store/templates';
import axios from './api';

export interface Project {
  dir: string;
  files: Template[];
}

export async function createProject({ name }: { name: string }): Promise<{ name: string }> {
  return axios.post('/api/projects', { name }).then((res) => res.data);
}

export async function deleteProject(name: string): Promise<{ name: string }> {
  return axios.delete(`/api/projects/${name}`).then((res) => res.data);
}

export async function renameProject({ oldName, name }: { oldName: string; name: string }): Promise<{ name: string }> {
  return axios.put(`/api/projects/${oldName}`, { name }).then((res) => res.data);
}

export async function getTemplate(templateId: string, hash?: string): Promise<Template> {
  return axios.get(`/api/templates/${templateId}`, { params: { hash } }).then((res) => res.data);
}

export type Commit = ReadCommitResult & {
  commit: ReadCommitResult['commit'] & {
    author: ReadCommitResult['commit']['author'] & {
      fullName?: string;
      avatar?: string;
      did?: string;
    };
  };
};

export async function getTemplateCommits(templateId: string): Promise<{
  commits: Commit[];
}> {
  return axios.get(`/api/templates/${templateId}/commits`).then((res) => res.data);
}

export async function getCommits(): Promise<{ commits: Commit[] }> {
  return axios.get('/api/templates/commits').then((res) => res.data);
}

export async function createTemplate(
  template: TemplateInput,
  { project }: { project?: string } = {}
): Promise<Template> {
  return axios.post('/api/templates', template, { params: { project } }).then((res) => res.data);
}

export async function updateTemplate(templateId: string, template: TemplateInput): Promise<Template> {
  return axios.put(`/api/templates/${templateId}`, template).then((res) => res.data);
}

export async function deleteTemplate(templateId: string): Promise<{}> {
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
