import { Folder } from '../../api/src/store/folders';
import axios from './api';

export interface FolderInput {
  name: string;
}

export async function getFolders(): Promise<{ folders: Folder[] }> {
  return axios.get('/api/folders').then((res) => res.data);
}

export async function createFolder(folder?: FolderInput): Promise<Folder> {
  return axios.post('/api/folders', folder).then((res) => res.data);
}

export async function updateFolder(folderId: string, folder: FolderInput): Promise<Folder> {
  return axios.put(`/api/folders/${folderId}`, folder).then((res) => res.data);
}

export async function deleteFolder(folderId: string): Promise<Folder> {
  return axios.delete(`/api/folders/${folderId}`).then((res) => res.data);
}
