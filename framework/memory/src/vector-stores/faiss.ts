import { IVectorStoreManager } from '@aigne/core';
import { Document } from '@langchain/core/documents';

import { AIKitEmbeddings } from '../lib/embeddings/ai-kit';
import { addVectors } from '../lib/vector-store';
import { migrate } from '../store/migrate';
import Content, { init as initContent } from '../store/models/content';
import { initSequelize } from '../store/sequelize';
import VectorStoreFaiss from '../store/vector-store-faiss';

export class ContentManager {
  constructor(dbPath: string = '') {
    this.init(dbPath);
  }

  private async init(dbPath: string) {
    const sequelize = initSequelize(dbPath);

    initContent(sequelize);

    await migrate(sequelize);
  }

  async addContent({ id, content, metadata }: { id: string; content: string; metadata: Record<string, any> }) {
    return await Content.create({ id, pageContent: content, metadata });
  }

  async getContent(id: string) {
    return await Content.findOne({ where: { id } });
  }

  async listContent(metadata: Record<string, any>, limit?: number) {
    const where = metadata ? Object.entries(metadata).map(([key, value]) => ({ [`metadata.${key}`]: value })) : {};
    return await Content.findAll({ where, limit, order: [['updatedAt', 'DESC']] });
  }

  async updateContent(id: string, content: string, metadata: Record<string, any>) {
    return await Content.update({ pageContent: content, metadata }, { where: { id } });
  }
}

export default class FaissVectorStoreManager implements IVectorStoreManager {
  private embeddings: AIKitEmbeddings = new AIKitEmbeddings();
  private vectorStore?: VectorStoreFaiss;
  private db: ContentManager;

  constructor(private vectorsFolderPath: string) {
    this.init();

    this.db = new ContentManager(`sqlite:${vectorsFolderPath}/content.db`);
  }

  async init() {
    this.vectorStore = await VectorStoreFaiss.load(this.vectorsFolderPath, this.embeddings);
  }

  async get(id: string) {
    return await this.db?.getContent(id);
  }

  async list(metadata: Record<string, any>, limit?: number) {
    return await this.db?.listContent(metadata, limit);
  }

  async insert(data: string, id: string, metadata: Record<string, any>) {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    await addVectors(this.vectorStore!, data, id, metadata);
    await this.db?.addContent({ id: id, content: data, metadata });
  }

  async delete(id: string) {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    await this.vectorStore.delete({ ids: [id] });
    await this.vectorStore.save();
  }

  async update(id: string, data: string, metadata: Record<string, any>) {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    await this.delete(id);
    await this.insert(data, id, metadata);

    await this.db?.updateContent(id, data, metadata);
  }

  async similaritySearch(query: string, k: number, metadata?: Record<string, any>): Promise<Document[]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    if (metadata) {
      const results = await this.vectorStore.similaritySearch(
        query,
        Math.min(k * 2, Object.keys(this.vectorStore.getMapping()).length),
        metadata
      );

      const filtered = results.filter((doc) => {
        return Object.entries(metadata).every(([key, value]) => {
          return doc.metadata[key] === value;
        });
      });

      return filtered;
    }

    return await this.vectorStore.similaritySearch(query, k);
  }

  async similaritySearchWithScore(
    query: string,
    k: number,
    metadata?: Record<string, any>
  ): Promise<[Document, number][]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    if (metadata) {
      const results = await this.vectorStore.similaritySearchWithScore(
        query,
        Math.min(k * 2, Object.keys(this.vectorStore.getMapping()).length),
        metadata
      );

      const filtered = results.filter(([doc, _score]) => {
        return Object.entries(metadata).every(([key, value]) => {
          return doc.metadata[key] === value;
        });
      });

      return filtered;
    }

    return await this.vectorStore.similaritySearchWithScore(
      query,
      Math.min(k, Object.keys(this.vectorStore.getMapping()).length),
      metadata
    );
  }
}
