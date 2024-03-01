import type { DatasetObject } from '@blocklet/dataset-sdk/types';
import { fetchEventSource } from '@microsoft/fetch-event-source';

import { CreateItem, CreateItemInput } from '../../api/src/routes/dataset-items';
import DatasetItem from '../../api/src/store/models/dataset/item';
import Dataset from '../../api/src/store/models/dataset/list';
import DatasetSegment from '../../api/src/store/models/dataset/segment';
import axios from './api';

export interface DatasetInput {
  name?: string | null;
  description?: string | null;
}

export async function getDatasetList(): Promise<DatasetObject[]> {
  return axios.get('/api/collections.json').then((res) => res.data);
}

export async function getDatasets(): Promise<{ datasets: Dataset[] }> {
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

export async function getUnits(datasetId: string, params: { page?: number; size?: number }): Promise<any> {
  return axios.get(`/api/datasets/units/${datasetId}/items`, { params }).then((res) => res.data);
}

export async function getUnit(datasetId: string, unitId: string): Promise<{ dataset: Dataset; unit: DatasetItem }> {
  return axios.get(`/api/datasets/units/${datasetId}/${unitId}`).then((res) => res.data);
}

export async function deleteUnit(datasetId: string, unitId: string): Promise<{ dataset: Dataset; unit: DatasetItem }> {
  return axios.delete(`/api/datasets/units/${datasetId}/${unitId}`).then((res) => res.data);
}

export async function createUnit(datasetId: string, input: { type: string; name: string }): Promise<any> {
  return axios.post(`/api/datasets/units/${datasetId}/create`, input).then((res) => res.data);
}

export async function getSegments(
  datasetId: string,
  unitId: string,
  params: { page?: number; size?: number } = {}
): Promise<{ items: DatasetSegment[]; total: number }> {
  return axios.get(`/api/datasets/segments/${datasetId}/${unitId}`, { params }).then((res) => res.data);
}

export async function createSegment(datasetId: string, unitId: string, content: string): Promise<any> {
  return axios.post(`/api/datasets/segments/${datasetId}/${unitId}`, { content }).then((res) => res.data);
}

export async function deleteSegment(segmentId: string): Promise<any> {
  return axios.delete(`/api/datasets/segments/${segmentId}`).then((res) => res.data);
}

export async function createDatasetItems(datasetId: string, input: CreateItem): Promise<DatasetItem>;
export async function createDatasetItems(datasetId: string, input: CreateItem[]): Promise<DatasetItem[]>;
export async function createDatasetItems(
  datasetId: string,
  input: CreateItemInput
): Promise<DatasetItem | DatasetItem[]> {
  return axios.post(`/api/datasets/units/${datasetId}/items`, input).then((res) => res.data);
}

export async function deleteDatasetItem({ datasetId, itemId }: { datasetId: string; itemId: string }): Promise<{}> {
  return axios.delete(`/api/datasets/${datasetId}/items/${itemId}`).then((res) => res.data);
}

export async function processDatasetItem({ datasetId, itemId }: { datasetId: string; itemId: string }): Promise<{}> {
  return axios.post(`/api/datasets/${datasetId}/items/${itemId}/embedding`).then((res) => res.data);
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
    | { type: 'list'; list: { itemId: string; total?: number; current?: number }[] }
    | { type: 'change'; itemId: string; total?: number; current?: number }
    | { type: 'complete'; itemId: string }
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
