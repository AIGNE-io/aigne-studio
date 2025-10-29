import { Database } from '@blocklet/sdk/lib/database';

export interface Folder {
  _id?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy: string;
  updatedBy: string;
}

export default class Folders extends Database<Folder> {
  constructor() {
    super('folders');
  }
}

export const folders = new Folders();
