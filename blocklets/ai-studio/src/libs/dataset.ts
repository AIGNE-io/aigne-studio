import type { DatasetObject } from '@blocklet/dataset-sdk/types';
import { fetchEventSource } from '@microsoft/fetch-event-source';

import { CreateDiscussionItem, CreateDiscussionItemInput } from '../../api/src/routes/dataset/documents';
import Dataset from '../../api/src/store/models/dataset/dataset';
import DatasetDocument from '../../api/src/store/models/dataset/document';
import DatasetSegment from '../../api/src/store/models/dataset/segment';
import axios from './api';

export interface DatasetInput {
  name?: string | null;
  description?: string | null;
  appId?: string;
}

export async function getAPIList(): Promise<DatasetObject[]> {
  return axios.get('/api/collections.json').then((res) => res.data);
}

export async function getDatasets(appId?: string): Promise<Dataset[]> {
  return axios.get('/api/datasets', { params: { appId } }).then((res) => res.data);
}

export async function getDataset(datasetId: string): Promise<Dataset> {
  return axios.get(`/api/datasets/${datasetId}`).then((res) => res.data);
}

export async function createDataset(input?: DatasetInput): Promise<Dataset> {
  return axios.post('/api/datasets', input).then((res) => res.data);
}

export async function updateDataset(datasetId: string, input: DatasetInput): Promise<Dataset> {
  return axios.put(`/api/datasets/${datasetId}`, input).then((res) => res.data);
}

export async function deleteDataset(datasetId: string): Promise<any> {
  return axios.delete(`/api/datasets/${datasetId}`).then((res) => res.data);
}

export async function getDocuments(datasetId: string, params: { page?: number; size?: number }): Promise<any> {
  return axios.get(`/api/datasets/${datasetId}/documents`, { params }).then((res) => res.data);
}

export async function getDocument(
  datasetId: string,
  documentId: string
): Promise<{ dataset: Dataset; document: DatasetDocument }> {
  return axios.get(`/api/datasets/${datasetId}/documents/${documentId}`).then((res) => res.data);
}

export async function deleteDocument(
  datasetId: string,
  documentId: string
): Promise<{ dataset: Dataset; document: DatasetDocument }> {
  return axios.delete(`/api/datasets/${datasetId}/documents/${documentId}`).then((res) => res.data);
}

export async function createTextDocument(
  datasetId: string,
  input: { name: string; content?: string }
): Promise<DatasetDocument> {
  return axios.post(`/api/datasets/${datasetId}/documents/text`, input).then((res) => res.data);
}

export async function updateTextDocument(
  datasetId: string,
  documentId: string,
  input: { name: string; content?: string }
): Promise<DatasetDocument> {
  return axios.put(`/api/datasets/${datasetId}/documents/${documentId}/text`, input).then((res) => res.data);
}

export async function createFileDocument(datasetId: string, form: FormData): Promise<DatasetDocument> {
  return axios.post(`/api/datasets/${datasetId}/documents/file`, form).then((res) => res.data);
}

export async function updateFileDocument(
  datasetId: string,
  documentId: string,
  form: FormData
): Promise<DatasetDocument> {
  return axios.put(`/api/datasets/${datasetId}/documents/${documentId}/file`, form).then((res) => res.data);
}

export async function uploadDocumentName(
  datasetId: string,
  documentId: string,
  input: { name: string }
): Promise<{ data: string }> {
  return axios.put(`/api/datasets/${datasetId}/documents/${documentId}/name`, input).then((res) => res.data);
}

export async function reloadEmbedding(datasetId: string, documentId: string): Promise<{ data: string }> {
  return axios.post(`/api/datasets/${datasetId}/documents/${documentId}/embedding`).then((res) => res.data);
}

export async function getSegments(
  datasetId: string,
  documentId: string,
  params: { page?: number; size?: number } = {}
): Promise<{ items: DatasetSegment[]; total: number; page: number }> {
  return axios.get(`/api/datasets/${datasetId}/documents/${documentId}/segments`, { params }).then((res) => res.data);
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
  return axios.post(`/api/datasets/${datasetId}/documents/discussion`, input).then((res) => res.data);
}

export async function watchDatasetEmbeddings({
  datasetId,
  signal,
}: {
  datasetId: string;
  signal?: AbortSignal | null;
}) {
  const prefix = blocklet?.prefix || '';

  return new ReadableStream<
    | { type: 'change'; documentId: string; embeddingStatus: string; embeddingEndAt?: Date; embeddingStartAt?: Date }
    | { type: 'complete'; documentId: string; embeddingStatus: string; embeddingEndAt?: Date; embeddingStartAt?: Date }
    | { type: 'event'; documentId: string }
    | { type: 'error'; documentId: string; embeddingStatus: string; message: string }
  >({
    async start(controller) {
      await fetchEventSource(`${prefix}/api/datasets/${datasetId}/embeddings`, {
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
