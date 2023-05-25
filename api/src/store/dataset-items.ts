import Database from '@blocklet/sdk/lib/database';

export interface DatasetItem {
  _id?: string;
  datasetId: string;
  name?: string;
  data?: {
    type: 'discussion';
    id: string;
  };
  createdAt?: string;
  updatedAt?: string;
  createdBy: string;
  updatedBy: string;
  embeddedAt?: string;
  error?: string;
}

export default class DatasetItems extends Database<DatasetItem> {
  constructor() {
    super('dataset-items');
  }
}

export const datasetItems = new DatasetItems();
