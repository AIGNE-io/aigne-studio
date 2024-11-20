import { stat, writeFile } from 'fs/promises';
import { join } from 'path';

import { getEmbeddingDir } from '@api/libs/ensure-dir';

import DatasetDocument from '../../../store/models/dataset/document';
import { saveContentToVectorStore } from '../vector-store';

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

  preprocessText(text: string): string {
    // 替换连续的空格、换行符和制表符
    let processed = text.replace(/\s+/g, ' ');
    // 删除 URL
    processed = processed.replace(/https?:\/\/(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s]*)?/gi, '');
    // 删除邮件地址
    processed = processed.replace(/[\w.-]+@[\w.-]+\w+/g, '');

    return processed.trim();
  }

  protected abstract saveOriginalFile(): Promise<void>;
  protected abstract ProcessedFile(): Promise<void>;
  protected async startRAG(): Promise<void> {
    this.embeddingStatus = 'processing';

    await saveContentToVectorStore({
      content: this.preprocessText(this.content!),
      datasetId: this.knowledgeId,
      documentId: this.documentId,
      targetId: this.documentId,
    });

    this.embeddingStatus = 'completed';
  }
}
