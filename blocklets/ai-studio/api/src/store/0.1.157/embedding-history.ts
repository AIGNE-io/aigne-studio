import { Database } from '@blocklet/sdk/lib/database';

export interface EmbeddingHistory {
  _id?: string;
  targetId: string;
  targetVersion?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  error?: string;
}

export default class EmbeddingHistories extends Database<EmbeddingHistory> {
  constructor() {
    super('embedding-history');
  }
}

export const embeddingHistories = new EmbeddingHistories();
