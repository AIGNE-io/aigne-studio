import type { DatasetObject } from '@blocklet/dataset-sdk/types';

import { CreateItem, CreateItemInput } from '../../api/src/routes/dataset/documents';
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
  return axios.get('/api/datasets', { params: { projectId } }).then((res) => res.data);
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
  return axios.post(`/api/datasets/${datasetId}/documents`, input).then((res) => res.data);
}

export async function uploadDocument(datasetId: string, form: any): Promise<DatasetDocument> {
  return axios.post(`/api/datasets/${datasetId}/documents/file`, form).then((res) => res.data);
}

export async function uploadDocumentParams(
  datasetId: string,
  documentId: string,
  input: { name: string }
): Promise<{ data: string }> {
  return axios.put(`/api/datasets/${datasetId}/documents/${documentId}`, input).then((res) => res.data);
}

export async function getSegments(
  datasetId: string,
  documentId: string,
  params: { page?: number; size?: number } = {}
): Promise<{ items: DatasetSegment[]; total: number }> {
  return axios.get(`/api/datasets/${datasetId}/documents/${documentId}/segment`, { params }).then((res) => res.data);
}

export async function createSegment(datasetId: string, documentId: string, content: string): Promise<any> {
  return axios.post(`/api/datasets/${datasetId}/documents/${documentId}/segment`, { content }).then((res) => res.data);
}

export async function deleteSegment(datasetId: string, documentId: string, segmentId: string): Promise<any> {
  return axios
    .delete(`/api/datasets/${datasetId}/documents/${documentId}/segment/${segmentId}`)
    .then((res) => res.data);
}

export async function updateSegment(
  datasetId: string,
  documentId: string,
  segmentId: string,
  content: string
): Promise<any> {
  return axios
    .put(`/api/datasets/${datasetId}/documents/${documentId}/segment/${segmentId}`, { content })
    .then((res) => res.data);
}

export async function createDatasetDocuments(datasetId: string, input: CreateItem): Promise<DatasetDocument>;
export async function createDatasetDocuments(datasetId: string, input: CreateItem[]): Promise<DatasetDocument[]>;
export async function createDatasetDocuments(
  datasetId: string,
  input: CreateItemInput
): Promise<DatasetDocument | DatasetDocument[]> {
  return axios.post(`/api/datasets/${datasetId}/documents/discussion`, input).then((res) => res.data);
}
