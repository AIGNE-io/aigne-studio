import { joinURL, withQuery } from 'ufo';

import { AI_STUDIO_DID } from '../constants';
import { request } from './request';

export interface Dataset {
  id: string;
  name?: string;
  description?: string;
}

export async function getDataset({ datasetId }: { datasetId: string }): Promise<Dataset> {
  const url = joinURL('/api/datasets/', datasetId);
  const result = await request<Dataset>({ blocklet: AI_STUDIO_DID, url });
  if (!result) throw new Error('Collection not found!');

  return result;
}

export async function getKnowledgeList({ projectId }: { projectId: string }): Promise<Array<Dataset>> {
  const url = withQuery('/api/datasets', { projectId });
  return request({ blocklet: AI_STUDIO_DID, url });
}

export async function createDataset({
  projectId,
  name,
  description,
}: {
  projectId: string;
  name: string;
  description?: string;
}) {
  return request({
    blocklet: AI_STUDIO_DID,
    method: 'POST',
    url: '/api/datasets',
    body: { projectId, name, description },
  });
}

export async function updateDataset(datasetId: string, input: Pick<Dataset, 'name' | 'description'>): Promise<Dataset> {
  return request({
    blocklet: AI_STUDIO_DID,
    method: 'PUT',
    url: joinURL('/api/datasets', datasetId),
    body: input,
  });
}

export async function deleteDataset(datasetId: string): Promise<void> {
  const url = joinURL('/api/datasets', datasetId);
  return request({ blocklet: AI_STUDIO_DID, method: 'DELETE', url });
}

export interface Document {
  id: string;
  name?: string;
}

export async function deleteDocument(datasetId: string, documentId: string): Promise<void> {
  return request({
    blocklet: AI_STUDIO_DID,
    method: 'DELETE',
    url: joinURL('/api/datasets', datasetId, 'documents', documentId),
  });
}

export async function getDocuments(datasetId: string): Promise<{ items: Array<Document>; total: number }> {
  return request({
    blocklet: AI_STUDIO_DID,
    url: joinURL('/api/datasets', datasetId, 'documents'),
  });
}

export async function getDocument(datasetId: string, documentId: string): Promise<{ document: Document }> {
  const result = await request<{ document: Document }>({
    blocklet: AI_STUDIO_DID,
    url: joinURL('/api/datasets', datasetId, 'documents', documentId),
  });
  if (!result?.document) throw new Error('Document not found!');

  return result;
}

export async function createDocument(
  datasetId: string,
  type: 'text' | 'file',
  input: { name: string; content: string } | File
) {
  if (type === 'file') return createDocumentFile(datasetId, input as File);

  return request({
    blocklet: AI_STUDIO_DID,
    method: 'POST',
    url: joinURL('/api/datasets', datasetId, 'documents', type),
    body: input,
  });
}

export async function createDocumentFile(datasetId: string, file: File) {
  const form = new FormData();
  form.append('data', file);
  form.append('type', 'file');
  form.append('filename', file.name);

  return request({
    blocklet: AI_STUDIO_DID,
    method: 'POST',
    url: joinURL('/api/datasets', datasetId, 'documents/file'),
    body: form,
  });
}

export async function updateDocument(
  datasetId: string,
  documentId: string,
  type: 'text',
  input: { name: string; content: string }
) {
  return request({
    blocklet: AI_STUDIO_DID,
    method: 'PUT',
    url: joinURL('/api/datasets', datasetId, 'documents', documentId, type),
    body: input,
  });
}
