import type { DatasetObject } from '@blocklet/dataset-sdk/types';
import flattenApiStructure from '@blocklet/dataset-sdk/util/flatten-open-api';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { joinURL } from 'ufo';

import Dataset from '../../api/src/store/models/dataset/dataset';
import DatasetDocument from '../../api/src/store/models/dataset/document';
import DatasetSegment from '../../api/src/store/models/dataset/segment';
import axios from './api';
import { AIGNE_RUNTIME_MOUNT_POINT } from './constants';

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
    .get(`/api/datasets/${datasetId}/search`, { baseURL: AIGNE_RUNTIME_MOUNT_POINT, params: { message } })
    .then((res) => res.data);
}

export async function getAPIList(): Promise<DatasetObject[]> {
  return axios
    .get('/.well-known/service/openapi.json', { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => flattenApiStructure(res.data));
}

export async function getDatasets({ projectId }: { projectId?: string }): Promise<Dataset[]> {
  return axios
    .get('/api/datasets', { baseURL: AIGNE_RUNTIME_MOUNT_POINT, params: { projectId } })
    .then((res) => res.data);
}

export async function getDataset(datasetId: string): Promise<Dataset> {
  return axios.get(`/api/datasets/${datasetId}`, { baseURL: AIGNE_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function createDataset(input?: DatasetInput): Promise<Dataset> {
  return axios.post('/api/datasets', input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function updateDataset(datasetId: string, input: DatasetInput): Promise<Dataset> {
  return axios.put(`/api/datasets/${datasetId}`, input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function deleteDataset(datasetId: string): Promise<any> {
  return axios.delete(`/api/datasets/${datasetId}`, { baseURL: AIGNE_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function getDocuments(
  datasetId: string,
  params: { blockletDid?: string; page?: number; size?: number }
): Promise<any> {
  return axios
    .get(`/api/datasets/${datasetId}/documents`, { baseURL: AIGNE_RUNTIME_MOUNT_POINT, params })
    .then((res) => res.data);
}

export async function getDocument(
  datasetId: string,
  documentId: string
): Promise<{ dataset: Dataset; document: DatasetDocument }> {
  return axios
    .get(`/api/datasets/${datasetId}/documents/${documentId}`, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function getDocumentContent(datasetId: string, documentId: string): Promise<{ content: string[] }> {
  return axios
    .get(`/api/datasets/${datasetId}/documents/${documentId}/content`, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function deleteDocument(
  datasetId: string,
  documentId: string
): Promise<{ dataset: Dataset; document: DatasetDocument }> {
  return axios
    .delete(`/api/datasets/${datasetId}/documents/${documentId}`, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function createTextDocument(
  datasetId: string,
  input: { name: string; content?: string }
): Promise<DatasetDocument> {
  return axios
    .post(`/api/datasets/${datasetId}/documents/text`, input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function updateTextDocument(
  datasetId: string,
  documentId: string,
  input: { name: string; content?: string }
): Promise<DatasetDocument> {
  return axios
    .put(`/api/datasets/${datasetId}/documents/${documentId}/text`, input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function createFileDocument(datasetId: string, form: FormData): Promise<DatasetDocument> {
  return axios
    .post(`/api/datasets/${datasetId}/documents/file`, form, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function updateFileDocument(
  datasetId: string,
  documentId: string,
  form: FormData
): Promise<DatasetDocument> {
  return axios
    .put(`/api/datasets/${datasetId}/documents/${documentId}/file`, form, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function uploadDocumentName(
  datasetId: string,
  documentId: string,
  input: { name: string }
): Promise<{ data: string }> {
  return axios
    .put(`/api/datasets/${datasetId}/documents/${documentId}/name`, input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function reloadEmbedding(datasetId: string, documentId: string): Promise<{ data: string }> {
  return axios
    .post(`/api/datasets/${datasetId}/documents/${documentId}/embedding`, {}, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function getSegments(
  datasetId: string,
  documentId: string,
  params: { page?: number; size?: number } = {}
): Promise<{ items: DatasetSegment[]; total: number; page: number }> {
  return axios
    .get(`/api/datasets/${datasetId}/documents/${documentId}/segments`, { baseURL: AIGNE_RUNTIME_MOUNT_POINT, params })
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
    .post(`/api/datasets/${datasetId}/documents/discussion`, input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function watchDatasetEmbeddings({
  datasetId,
  signal,
}: {
  datasetId: string;
  signal?: AbortSignal | null;
}) {
  const url = joinURL(window.location.origin, AIGNE_RUNTIME_MOUNT_POINT, `/api/datasets/${datasetId}/embeddings`);

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
