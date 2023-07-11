import joinUrl from 'url-join';

import { TemplateInput } from '../../api/src/routes/templates';
import { CreateFileInput, EntryWithMeta } from '../../api/src/routes/tree';
import { Template } from '../../api/src/store/templates';
import axios from './api';

export async function getTree({ ref }: { ref: string }): Promise<{ files: EntryWithMeta[] }> {
  return axios.get(joinUrl('/api/tree', ref || '')).then((res) => res.data);
}

export async function createFile(options: {
  branch: string;
  path: string;
  input: CreateFileInput & { type: 'file' };
}): Promise<Template>;
export async function createFile(options: {
  branch: string;
  path: string;
  input: CreateFileInput & { type: 'folder' };
}): Promise<{ name: string }>;
export async function createFile({ branch, path, input }: { branch: string; path: string; input: CreateFileInput }) {
  return axios.post(joinUrl('/api/tree', branch, path), input).then((res) => res.data);
}

export async function deleteFile({ branch, path }: { branch: string; path: string }): Promise<{}> {
  return axios.delete(joinUrl('/api/tree', branch, path)).then((res) => res.data);
}

export async function moveFile({ branch, path, to }: { branch: string; path: string; to: string }): Promise<{}> {
  return axios.patch(joinUrl('/api/tree', branch, path, 'path'), { path: to }).then((res) => res.data);
}

export async function getFile({ ref, path }: { ref: string; path: string }): Promise<Template> {
  return axios.get(joinUrl('/api/tree', ref || '', path)).then((res) => res.data);
}

export async function putFile({
  ref,
  path,
  data,
}: {
  ref: string;
  path: string;
  data: TemplateInput;
}): Promise<Template> {
  return axios.put(joinUrl('/api/tree', ref || '', path), data).then((res) => res.data);
}
