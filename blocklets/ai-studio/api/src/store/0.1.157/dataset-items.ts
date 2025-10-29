import { Database } from '@blocklet/sdk/lib/database';

export interface DatasetItem {
  _id?: string;
  datasetId: string;
  name?: string;
  data?:
    | {
        type: 'discussion';
        fullSite?: false;
        id: string;
      }
    | {
        type: 'discussion';
        fullSite: true;
        id?: undefined;
      };
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy: string;
  updatedBy: string;
  embeddedAt?: string | Date;
  error?: string;
}

export default class DatasetItems extends Database<DatasetItem> {
  constructor() {
    super('dataset-items');
  }
}

export const datasetItems = new DatasetItems();
