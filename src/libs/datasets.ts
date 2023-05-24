import { Dataset } from '../../api/src/store/datasets';
import axios from './api';

export interface DatasetInput {
  name?: string | null;
}

export async function getDatasets(): Promise<{ datasets: Dataset[] }> {
  return axios.get('/api/datasets').then((res) => res.data);
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
