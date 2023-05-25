import { CreateItem, CreateItemInput } from '../../api/src/routes/dataset-items';
import { DatasetItem } from '../../api/src/store/dataset-items';
import { Dataset } from '../../api/src/store/datasets';
import axios from './api';

export interface DatasetInput {
  name?: string | null;
}

export async function getDatasets(): Promise<{ datasets: Dataset[] }> {
  return axios.get('/api/datasets').then((res) => res.data);
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

export async function deleteDataset(datasetId: string): Promise<Dataset> {
  return axios.delete(`/api/datasets/${datasetId}`).then((res) => res.data);
}

export async function getDatasetItems({
  datasetId,
}: {
  datasetId: string;
}): Promise<{ items: DatasetItem[]; total: number }> {
  return axios.get(`/api/datasets/${datasetId}/items`).then((res) => res.data);
}

export async function createDatasetItem(datasetId: string, input: CreateItem): Promise<DatasetItem>;
export async function createDatasetItem(datasetId: string, input: CreateItem[]): Promise<DatasetItem[]>;
export async function createDatasetItem(
  datasetId: string,
  input: CreateItemInput
): Promise<DatasetItem | DatasetItem[]> {
  return axios.post(`/api/datasets/${datasetId}/items`, input).then((res) => res.data);
}

export async function deleteDatasetItem({ datasetId, itemId }: { datasetId: string; itemId: string }): Promise<{}> {
  return axios.delete(`/api/datasets/${datasetId}/items/${itemId}`).then((res) => res.data);
}
