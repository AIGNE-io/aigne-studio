import { Database } from '@blocklet/sdk/lib/database';

export interface Tag {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export default class Tags extends Database {
  constructor() {
    super('tags', { timestampData: false });
  }

  async createIfNotExists({ tags, did }: { tags: string[]; did: string }) {
    return Promise.all(
      tags.map(async (name) => {
        const now = new Date().toISOString();
        return (
          (await this.findOne({ name: { $regex: new RegExp(name, 'i') } })) ??
          (await this.insert({ name, createdAt: now, updatedAt: now, createdBy: did, updatedBy: did }))
        );
      })
    );
  }
}

export const tags = new Tags();
