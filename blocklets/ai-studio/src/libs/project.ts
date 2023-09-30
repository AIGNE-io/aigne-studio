import { CreateProjectInput, UpdateProjectInput } from '../../api/src/routes/project';
import { Project } from '../../api/src/store/projects';
import axios from './api';

export interface ProjectTemplate {
  _id: string;
  name: string;
}

export async function getProjectTemplates(): Promise<{ templates: ProjectTemplate[] }> {
  return {
    templates: [{ _id: '1', name: 'Blank' }],
  };
}

export async function getProjects(): Promise<{ projects: Project[] }> {
  return axios.get('/api/projects').then((res) => res.data);
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
