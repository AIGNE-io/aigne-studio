import { Assistant } from '@blocklet/ai-runtime/types';

import {
  AddProjectRemoteInput,
  CreateProjectInput,
  GetProjectsQuery,
  ProjectPullInput,
  ProjectPushInput,
  UpdateProjectInput,
} from '../../api/src/routes/project';
import Project from '../../api/src/store/models/project';
import axios from './api';

export type User = {
  did?: string;
  fullName?: string;
  avatar?: string;
};

export type ProjectWithUserInfo = Project & {
  branches: string[];
  users: User[];
};

export async function getProjects(query?: GetProjectsQuery): Promise<{
  projects: ProjectWithUserInfo[];
}> {
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
): Promise<{ assistants: (Assistant & { parent?: string[] })[] }> {
  return axios.post(`/api/projects/import/${projectId}/${ref}`, data).then((res) => res.data);
}

export async function addProjectRemote(projectId: string, data: AddProjectRemoteInput): Promise<{}> {
  return axios.post(`/api/projects/${projectId}/remote`, data).then((res) => res.data);
}

export async function projectPush(projectId: string, input?: ProjectPushInput): Promise<{}> {
  return axios.post(`/api/projects/${projectId}/remote/push`, input).then((res) => res.data);
}

export async function projectPull(projectId: string, input?: ProjectPullInput): Promise<{}> {
  return axios.post(`/api/projects/${projectId}/remote/pull`, input).then((res) => res.data);
}

export async function projectSync(projectId: string): Promise<{}> {
  return axios.post(`/api/projects/${projectId}/remote/sync`).then((res) => res.data);
}
