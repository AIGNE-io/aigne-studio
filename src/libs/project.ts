import { Project } from '../../api/src/store/projects';
import axios from './api';

export interface ProjectInput {
  name: string | null;
}

export async function getProjects(): Promise<{ projects: Project[] }> {
  return axios.get('/api/projects').then((res) => res.data);
}

export async function getProject(projectId: string): Promise<Project> {
  return axios.get(`/api/projects/${projectId}`).then((res) => res.data);
}

export async function createProject(input?: ProjectInput): Promise<Project> {
  return axios.post('/api/projects', input).then((res) => res.data);
}

export async function updateProject(projectId: string, input: ProjectInput): Promise<Project> {
  return axios.put(`/api/projects/${projectId}`, input).then((res) => res.data);
}

export async function deleteProject(projectId: string): Promise<Project> {
  return axios.delete(`/api/projects/${projectId}`).then((res) => res.data);
}
