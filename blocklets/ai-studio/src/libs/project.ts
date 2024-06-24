import AgentInputSecret from '@api/store/models/agent-input-secret';
import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { Assistant } from '@blocklet/ai-runtime/types';
import pick from 'lodash/pick';
import { joinURL, withQuery } from 'ufo';

import {
  AddProjectRemoteInput,
  CreateOrUpdateAgentInputSecretPayload,
  CreateProjectInput,
  ImportProjectInput,
  ProjectPullInput,
  ProjectPushInput,
  SyncTarget,
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
  blockletDid?: string;
};

export async function getProjects(): Promise<{
  projects: ProjectWithUserInfo[];
  templates: ProjectWithUserInfo[];
  examples: ProjectWithUserInfo[];
}> {
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

export async function listProjectsByDidSpaces(endpoint: string): Promise<Project[]> {
  return axios.get(`/api/import/from-did-spaces/list-projects?endpoint=${endpoint}`).then((res) => res.data);
}

export async function exportAssistantsToProject(
  projectId: string,
  ref: string,
  data: { projectId: string; ref: string; resources: string[] }
): Promise<{ assistants: (Assistant & { parent?: string[] })[] }> {
  return axios.post(`/api/projects/export/${projectId}/${ref}`, data).then((res) => res.data);
}

export async function addProjectRemote(projectId: string, data: AddProjectRemoteInput): Promise<{}> {
  return axios.post(`/api/projects/${projectId}/remote`, data).then((res) => res.data);
}

export async function deleteProjectRemote(projectId: string): Promise<{}> {
  return axios.delete(`/api/projects/${projectId}/remote`).then((res) => res.data);
}

export async function projectPush(projectId: string, input?: ProjectPushInput): Promise<{}> {
  return axios.post(`/api/projects/${projectId}/remote/push`, input).then((res) => res.data);
}

export async function projectPull(projectId: string, input?: ProjectPullInput): Promise<{}> {
  return axios.post(`/api/projects/${projectId}/remote/pull`, input).then((res) => res.data);
}

export async function projectImport(input?: ImportProjectInput): Promise<Project> {
  return axios.post('/api/projects/import', input).then((res) => res.data);
}

export async function fromDidSpacesImport({
  endpoint,
  projectId,
  props,
}: {
  endpoint: string;
  projectId: string;
  props: Pick<Project, 'name' | 'description'>;
}): Promise<Project> {
  return axios
    .post('/api/import/from-did-spaces/import-project', {
      endpoint,
      projectId,
      props: pick(props, ['name', 'description']),
    })
    .then((res) => res.data);
}

export async function projectSync(projectId: string, target: SyncTarget = 'github'): Promise<{}> {
  return axios.post(`/api/projects/${projectId}/remote/sync?target=${target}`).then((res) => res.data);
}

// FIXME: use logo version instead of updatedAt for better caching
export function getProjectIconUrl(
  projectId: string,
  updatedAt: string | number | Date,
  { original }: { original?: boolean } = {}
) {
  if (!projectId) return '';
  const component = blocklet?.componentMountPoints.find((i) => i.did === AIGNE_STUDIO_COMPONENT_DID);
  return withQuery(
    joinURL(window.location.origin, component?.mountPoint || '', `/api/projects/${projectId}/logo.png`),
    original ? { version: updatedAt } : { imageFilter: 'resize', w: 140, version: updatedAt }
  );
}

export async function getProjectInputSecrets(
  projectId: string
): Promise<{ secrets: Omit<AgentInputSecret['dataValues'], 'secret'>[] }> {
  return axios.get(`/api/projects/${projectId}/agent-input-secrets`).then((res) => res.data);
}

export async function createOrUpdateProjectInputSecrets(
  projectId: string,
  input: CreateOrUpdateAgentInputSecretPayload
): Promise<{ secrets: Omit<AgentInputSecret['dataValues'], 'secret'>[] }> {
  return axios.post(`/api/projects/${projectId}/agent-input-secrets`, input).then((res) => res.data);
}
