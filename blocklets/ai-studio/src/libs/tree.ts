import joinUrl from 'url-join';

import { TemplateInput } from '../../api/src/routes/templates';
import { CreateFileInput, EntryWithMeta } from '../../api/src/routes/tree';
import { Template } from '../../api/src/store/templates';
import axios from './api';

export async function getTree({
  projectId,
  ref,
}: {
  projectId: string;
  ref: string;
}): Promise<{ files: EntryWithMeta[] }> {
  return axios.get(joinUrl('/api/projects', projectId, 'tree', ref || '')).then((res) => res.data);
}

export async function createFile(options: {
  projectId: string;
  branch: string;
  path: string;
  input: CreateFileInput & { type: 'file' };
}): Promise<Template>;
export async function createFile(options: {
  projectId: string;
  branch: string;
  path: string;
  input: CreateFileInput & { type: 'folder' };
}): Promise<{ name: string }>;
export async function createFile({
  projectId,
  branch,
  path,
  input,
}: {
  projectId: string;
  branch: string;
  path: string;
  input: CreateFileInput;
}) {
  return axios.post(joinUrl('/api/projects', projectId, 'tree', branch, path), input).then((res) => res.data);
}

export async function deleteFile({
  projectId,
  branch,
  path,
}: {
  projectId: string;
  branch: string;
  path: string;
}): Promise<{}> {
  return axios.delete(joinUrl('/api/projects', projectId, 'tree', branch, path)).then((res) => res.data);
}

export async function moveFile({
  projectId,
  branch,
  path,
  to,
}: {
  projectId: string;
  branch: string;
  path: string;
  to: string;
}): Promise<{}> {
  return axios
    .patch(joinUrl('/api/projects', projectId, 'tree', branch, path, 'path'), { path: to })
    .then((res) => res.data);
}

export async function getFile({
  projectId,
  ref,
  path,
}: {
  projectId: string;
  ref: string;
  path: string;
}): Promise<Template> {
  return axios.get(joinUrl('/api/projects', projectId, 'tree', ref || '', path)).then((res) => res.data);
}

export async function putFile({
  projectId,
  ref,
  path,
  data,
}: {
  projectId: string;
  ref: string;
  path: string;
  data: TemplateInput;
}): Promise<Template> {
  return axios.put(joinUrl('/api/projects', projectId, 'tree', ref || '', path), data).then((res) => res.data);
}
