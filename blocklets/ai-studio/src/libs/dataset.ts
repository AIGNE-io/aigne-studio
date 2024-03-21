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
  projectId?: string;
}

export async function getAPIList(): Promise<DatasetObject[]> {
  return axios.get('/api/collections.json').then((res) => res.data);
}

export async function getDatasets(projectId?: string): Promise<Dataset[]> {
  return axios.get('/api/datasets', { params: { appId: projectId } }).then((res) => res.data);
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

export async function createDocument(
  datasetId: string,
  input: { type: string; name: string; content?: string }
): Promise<DatasetDocument> {
  return axios.post(`/api/datasets/${datasetId}/documents/text`, input).then((res) => res.data);
}

export async function uploadDocument(datasetId: string, form: any): Promise<DatasetDocument> {
  return axios.post(`/api/datasets/${datasetId}/documents/file`, form).then((res) => res.data);
}

export async function uploadDocumentParams(
  datasetId: string,
  documentId: string,
  input: { name: string }
): Promise<{ data: string }> {
  return axios.put(`/api/datasets/${datasetId}/documents/${documentId}/name`, input).then((res) => res.data);
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
    | { type: 'change'; documentId: string; document: DatasetDocument }
    | { type: 'complete'; documentId: string; document: DatasetDocument }
    | { type: 'event'; documentId: string }
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
