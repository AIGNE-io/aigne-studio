import type { DatasetObject } from '@blocklet/dataset-sdk/types';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { joinURL } from 'ufo';

import Dataset from '../../api/src/store/models/dataset/dataset';
import DatasetDocument from '../../api/src/store/models/dataset/document';
import DatasetSegment from '../../api/src/store/models/dataset/segment';
import axios from './api';
import { AI_RUNTIME_MOUNT_POINT } from './constants';

export interface CreateDiscussionItem {
  name: string;
  data: {
    id: string;
    title: string;
    type?: 'discussion' | 'blog' | 'doc';
    from: 'discussion' | 'board' | 'discussionType';
    boardId?: string;
  };
}

export type CreateDiscussionItemInput = CreateDiscussionItem | CreateDiscussionItem[];

export interface DatasetInput {
  name?: string | null;
  description?: string | null;
  appId?: string;
}

export async function searchKnowledge({
  datasetId,
  message,
}: {
  datasetId: string;
  message: string;
}): Promise<{ docs: { content: string }[] }> {
  return axios
    .get(`/api/datasets/${datasetId}/search`, { baseURL: AI_RUNTIME_MOUNT_POINT, params: { message } })
    .then((res) => res.data);
}

export async function getAPIList(): Promise<DatasetObject[]> {
  return axios.get('/api/collections.json', { baseURL: AI_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function getDatasets(): Promise<Dataset[]> {
  return axios.get('/api/datasets', { baseURL: AI_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function getDataset(datasetId: string): Promise<Dataset> {
  return axios.get(`/api/datasets/${datasetId}`, { baseURL: AI_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function createDataset(input?: DatasetInput): Promise<Dataset> {
  return axios.post('/api/datasets', input, { baseURL: AI_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function updateDataset(datasetId: string, input: DatasetInput): Promise<Dataset> {
  return axios.put(`/api/datasets/${datasetId}`, input, { baseURL: AI_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function deleteDataset(datasetId: string): Promise<any> {
  return axios.delete(`/api/datasets/${datasetId}`, { baseURL: AI_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function getDocuments(
  datasetId: string,
  params: { blockletDid?: string; page?: number; size?: number }
): Promise<any> {
  return axios
    .get(`/api/datasets/${datasetId}/documents`, { baseURL: AI_RUNTIME_MOUNT_POINT, params })
    .then((res) => res.data);
}

export async function getDocument(
  datasetId: string,
  documentId: string
): Promise<{ dataset: Dataset; document: DatasetDocument }> {
  return axios
    .get(`/api/datasets/${datasetId}/documents/${documentId}`, { baseURL: AI_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function getDocumentContent(datasetId: string, documentId: string): Promise<{ content: string[] }> {
  return axios
    .get(`/api/datasets/${datasetId}/documents/${documentId}/content`, { baseURL: AI_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function deleteDocument(
  datasetId: string,
  documentId: string
): Promise<{ dataset: Dataset; document: DatasetDocument }> {
  return axios
    .delete(`/api/datasets/${datasetId}/documents/${documentId}`, { baseURL: AI_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function createTextDocument(
  datasetId: string,
  input: { name: string; content?: string }
): Promise<DatasetDocument> {
  return axios
    .post(`/api/datasets/${datasetId}/documents/text`, input, { baseURL: AI_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function updateTextDocument(
  datasetId: string,
  documentId: string,
  input: { name: string; content?: string }
): Promise<DatasetDocument> {
  return axios
    .put(`/api/datasets/${datasetId}/documents/${documentId}/text`, input, { baseURL: AI_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function createFileDocument(datasetId: string, form: FormData): Promise<DatasetDocument> {
  return axios
    .post(`/api/datasets/${datasetId}/documents/file`, form, { baseURL: AI_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function updateFileDocument(
  datasetId: string,
  documentId: string,
  form: FormData
): Promise<DatasetDocument> {
  return axios
    .put(`/api/datasets/${datasetId}/documents/${documentId}/file`, form, { baseURL: AI_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function uploadDocumentName(
  datasetId: string,
  documentId: string,
  input: { name: string }
): Promise<{ data: string }> {
  return axios
    .put(`/api/datasets/${datasetId}/documents/${documentId}/name`, input, { baseURL: AI_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function reloadEmbedding(datasetId: string, documentId: string): Promise<{ data: string }> {
  return axios
    .post(`/api/datasets/${datasetId}/documents/${documentId}/embedding`, {}, { baseURL: AI_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function getSegments(
  datasetId: string,
  documentId: string,
  params: { page?: number; size?: number } = {}
): Promise<{ items: DatasetSegment[]; total: number; page: number }> {
  return axios
    .get(`/api/datasets/${datasetId}/documents/${documentId}/segments`, { baseURL: AI_RUNTIME_MOUNT_POINT, params })
    .then((res) => res.data);
}

export async function createDatasetDocuments(datasetId: string, input: CreateDiscussionItem): Promise<DatasetDocument>;
export async function createDatasetDocuments(
  datasetId: string,
  input: CreateDiscussionItem[]
): Promise<DatasetDocument[]>;
export async function createDatasetDocuments(
  datasetId: string,
  input: CreateDiscussionItemInput
): Promise<DatasetDocument | DatasetDocument[]> {
  return axios
    .post(`/api/datasets/${datasetId}/documents/discussion`, input, { baseURL: AI_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function watchDatasetEmbeddings({
  datasetId,
  signal,
}: {
  datasetId: string;
  signal?: AbortSignal | null;
}) {
  const url = joinURL(window.location.origin, AI_RUNTIME_MOUNT_POINT, `/api/datasets/${datasetId}/embeddings`);

  return new ReadableStream<
    | { type: 'change'; documentId: string; embeddingStatus: string; embeddingEndAt?: Date; embeddingStartAt?: Date }
    | { type: 'complete'; documentId: string; embeddingStatus: string; embeddingEndAt?: Date; embeddingStartAt?: Date }
    | { type: 'event'; documentId: string }
    | { type: 'error'; documentId: string; embeddingStatus: string; message: string }
  >({
    async start(controller) {
      await fetchEventSource(url, {
        signal,
        method: 'GET',
        onmessage(e) {
          const data = JSON.parse(e.data);
          controller.enqueue({ ...data, type: e.event });
        },
        onerror(err) {
          throw err;
        },
        onclose() {
          controller.close();
        },
      });
    },
  });
}
