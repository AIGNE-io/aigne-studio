import { CreateProjectInput, GetProjectsQuery, UpdateProjectInput } from '../../api/src/routes/project';
import { Project } from '../../api/src/store/projects';
import { Template } from '../../api/src/store/templates';
import axios from './api';

export async function getProjects(query?: GetProjectsQuery): Promise<{ projects: Project[] }> {
  return axios.get('/api/projects', { params: query }).then((res) => res.data);
}

export async function getProject(projectId: string): Promise<Project> {
  return axios.get(`/api/projects/${projectId}`).then((res) => res.data);
}

export async function createProject(input?: CreateProjectInput): Promise<Project> {
  return axios.post('/api/projects', input).then((res) => res.data);
}

export async function updateProject(projectId: string, input: UpdateProjectInput): Promise<Project> {
  return axios.patch(`/api/projects/${projectId}`, input).then((res) => res.data);
}

export async function deleteProject(projectId: string): Promise<Project> {
  return axios.delete(`/api/projects/${projectId}`).then((res) => res.data);
}

export async function importTemplatesToProject(
  projectId: string,
  ref: string,
  data: { projectId: string; ref: string; resources: string[] }
): Promise<{ templates: Template[] }> {
  return axios.post(`/api/projects/${projectId}/${ref}/import`, data).then((res) => res.data);
}
