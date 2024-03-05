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
  return axios.get('/api/datasets/datasets/list').then((res) => res.data);
}

export async function getDataset(datasetId: string): Promise<Dataset> {
  return axios.get(`/api/datasets/datasets/${datasetId}`).then((res) => res.data);
}

export async function createDataset(input?: DatasetInput): Promise<Dataset> {
  return axios.post('/api/datasets/datasets/create', input).then((res) => res.data);
}

export async function updateDataset(datasetId: string, input: DatasetInput): Promise<Dataset> {
  return axios.put(`/api/datasets/datasets/${datasetId}`, input).then((res) => res.data);
}

export async function deleteDataset(datasetId: string): Promise<any> {
  return axios.delete(`/api/datasets/datasets/${datasetId}`).then((res) => res.data);
}

export async function getDocuments(datasetId: string, params: { page?: number; size?: number }): Promise<any> {
  return axios.get(`/api/datasets/documents/${datasetId}/items`, { params }).then((res) => res.data);
}

export async function getDocument(
  datasetId: string,
  documentId: string
): Promise<{ dataset: Dataset; document: DatasetItem }> {
  return axios.get(`/api/datasets/documents/${datasetId}/${documentId}`).then((res) => res.data);
}

export async function deleteDocument(
  datasetId: string,
  documentId: string
): Promise<{ dataset: Dataset; document: DatasetItem }> {
  return axios.delete(`/api/datasets/documents/${datasetId}/items/${documentId}`).then((res) => res.data);
}

export async function createDocument(
  datasetId: string,
  input: { type: string; name: string; content?: string }
): Promise<DatasetItem> {
  return axios.post(`/api/datasets/documents/${datasetId}/create`, input).then((res) => res.data);
}

export async function uploadDocument(datasetId: string, form: any): Promise<DatasetItem> {
  return axios.post(`/api/datasets/documents/${datasetId}/items/file`, form).then((res) => res.data);
}

export async function uploadDocumentName(
  datasetId: string,
  documentId: string,
  input: { name: string }
): Promise<{ data: string }> {
  return axios.put(`/api/datasets/documents/${datasetId}/${documentId}`, input).then((res) => res.data);
}

export async function getSegments(
  datasetId: string,
  documentId: string,
  params: { page?: number; size?: number } = {}
): Promise<{ items: DatasetSegment[]; total: number }> {
  return axios.get(`/api/datasets/segments/${datasetId}/${documentId}`, { params }).then((res) => res.data);
}

export async function createSegment(datasetId: string, documentId: string, content: string): Promise<any> {
  return axios.post(`/api/datasets/segments/${datasetId}/${documentId}`, { content }).then((res) => res.data);
}

export async function deleteSegment(datasetId: string, segmentId: string): Promise<any> {
  return axios.delete(`/api/datasets/segments/${datasetId}/${segmentId}`).then((res) => res.data);
}

export async function updateSegment(datasetId: string, segmentId: string, content: string): Promise<any> {
  return axios.put(`/api/datasets/segments/${datasetId}/${segmentId}`, { content }).then((res) => res.data);
}

export async function createDatasetDocuments(datasetId: string, input: CreateItem): Promise<DatasetItem>;
export async function createDatasetDocuments(datasetId: string, input: CreateItem[]): Promise<DatasetItem[]>;
export async function createDatasetDocuments(
  datasetId: string,
  input: CreateItemInput
): Promise<DatasetItem | DatasetItem[]> {
  return axios.post(`/api/datasets/documents/${datasetId}/items`, input).then((res) => res.data);
}
