import type { DatasetObject } from '@blocklet/dataset-sdk/types';

import { CreateItem, CreateItemInput } from '../../api/src/routes/dataset/documents';
import Dataset from '../../api/src/store/models/dataset/dataset';
import DatasetItem from '../../api/src/store/models/dataset/document';
import DatasetSegment from '../../api/src/store/models/dataset/segment';
import axios from './api';

export interface DatasetInput {
  name?: string | null;
  description?: string | null;
}

export async function getAPIList(): Promise<DatasetObject[]> {
  return axios.get('/api/collections.json').then((res) => res.data);
}

export async function getDatasets(): Promise<Dataset[]> {
  return axios.get('/api/dataset').then((res) => res.data);
}

export async function getDataset(datasetId: string): Promise<Dataset> {
  return axios.get(`/api/dataset/${datasetId}`).then((res) => res.data);
}

export async function createDataset(input?: DatasetInput): Promise<Dataset> {
  return axios.post('/api/dataset', input).then((res) => res.data);
}

export async function updateDataset(datasetId: string, input: DatasetInput): Promise<Dataset> {
  return axios.put(`/api/dataset/${datasetId}`, input).then((res) => res.data);
}

export async function deleteDataset(datasetId: string): Promise<any> {
  return axios.delete(`/api/dataset/${datasetId}`).then((res) => res.data);
}

export async function getDocuments(datasetId: string, params: { page?: number; size?: number }): Promise<any> {
  return axios.get(`/api/datasets/${datasetId}/document`, { params }).then((res) => res.data);
}

export async function getDocument(
  datasetId: string,
  documentId: string
): Promise<{ dataset: Dataset; document: DatasetItem }> {
  return axios.get(`/api/dataset/${datasetId}/document/${documentId}`).then((res) => res.data);
}

export async function deleteDocument(
  datasetId: string,
  documentId: string
): Promise<{ dataset: Dataset; document: DatasetItem }> {
  return axios.delete(`/api/dataset/${datasetId}/document/${documentId}`).then((res) => res.data);
}

export async function createDocument(
  datasetId: string,
  input: { type: string; name: string; content?: string }
): Promise<DatasetItem> {
  return axios.post(`/api/dataset/${datasetId}/document`, input).then((res) => res.data);
}

export async function uploadDocument(datasetId: string, form: any): Promise<DatasetItem> {
  return axios.post(`/api/datasets/${datasetId}/document/file`, form).then((res) => res.data);
}

export async function uploadDocumentName(
  datasetId: string,
  documentId: string,
  input: { name: string }
): Promise<{ data: string }> {
  return axios.put(`/api/dataset/${datasetId}/document/${documentId}`, input).then((res) => res.data);
}

export async function getSegments(
  datasetId: string,
  documentId: string,
  params: { page?: number; size?: number } = {}
): Promise<{ items: DatasetSegment[]; total: number }> {
  return axios.get(`/api/dataset/${datasetId}/document/${documentId}/segment`, { params }).then((res) => res.data);
}

export async function createSegment(datasetId: string, documentId: string, content: string): Promise<any> {
  return axios.post(`/api/dataset/${datasetId}/document/${documentId}/segment`, { content }).then((res) => res.data);
}

export async function deleteSegment(datasetId: string, documentId: string, segmentId: string): Promise<any> {
  return axios.delete(`/api/dataset/${datasetId}/document/${documentId}/segment/${segmentId}`).then((res) => res.data);
}

export async function updateSegment(
  datasetId: string,
  documentId: string,
  segmentId: string,
  content: string
): Promise<any> {
  return axios
    .put(`/api/dataset/${datasetId}/document/${documentId}/segment/${segmentId}`, { content })
    .then((res) => res.data);
}

export async function createDatasetDocuments(datasetId: string, input: CreateItem): Promise<DatasetItem>;
export async function createDatasetDocuments(datasetId: string, input: CreateItem[]): Promise<DatasetItem[]>;
export async function createDatasetDocuments(
  datasetId: string,
  input: CreateItemInput
): Promise<DatasetItem | DatasetItem[]> {
  return axios.post(`/api/dataset/${datasetId}/documents`, input).then((res) => res.data);
}
