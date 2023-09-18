import Database from '@blocklet/sdk/lib/database';

export interface Dataset {
  _id?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy: string;
  updatedBy: string;
}

export default class Datasets extends Database<Dataset> {
  constructor() {
    super('datasets');
  }
}

export const datasets = new Datasets();
