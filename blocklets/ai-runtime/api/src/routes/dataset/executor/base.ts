import { stat, writeFile } from 'fs/promises';
import { join } from 'path';

import { getEmbeddingDir } from '@api/libs/ensure-dir';

import DatasetDocument from '../../../store/models/dataset/document';

export abstract class BaseProcessor {
  protected knowledgeId: string;

  protected documentId: string;

  protected sse: any;

  protected embeddingStatus: 'idle' | 'processing' | 'completed' | 'error';

  public content?: string;

  constructor({ knowledgeId, documentId, sse }: { knowledgeId: string; documentId: string; sse: any }) {
    this.knowledgeId = knowledgeId;
    this.documentId = documentId;
    this.embeddingStatus = 'idle';
    this.sse = sse;
  }

  protected async saveContentToFile(): Promise<void> {
    const filePath = join(getEmbeddingDir(this.knowledgeId), `${this.documentId}.txt`);
    if (!this.content) {
      throw new Error('Content is not available');
    }
    await writeFile(filePath, this.content!);
    await DatasetDocument.update(
      { size: (await stat(filePath)).size },
      { where: { id: this.documentId, datasetId: this.knowledgeId } }
    );
  }

  async execute(): Promise<void> {
    try {
      await this.saveOriginalFile();
      await this.ProcessedFile();
      await this.saveContentToFile();
      await this.startRAG();
    } catch (error) {
      this.embeddingStatus = 'error';
      throw error;
    }
  }

  protected abstract saveOriginalFile(): Promise<void>;
  protected abstract ProcessedFile(): Promise<void>;

  protected async startRAG(): Promise<void> {
    this.embeddingStatus = 'processing';
    // RAG处理逻辑
    this.embeddingStatus = 'completed';
  }
}
