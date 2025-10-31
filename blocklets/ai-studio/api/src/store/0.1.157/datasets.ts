import { Database } from '@blocklet/sdk/lib/database';

export interface Dataset {
  _id?: string;
  name?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy: string;
  updatedBy: string;
}

export default class Datasets extends Database<Dataset> {
  constructor() {
    super('datasets');
  }
}

export const datasets = new Datasets();
