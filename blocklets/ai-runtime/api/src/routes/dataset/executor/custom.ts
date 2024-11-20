import { readFile, writeFile } from 'fs/promises';

import { getUploadDir } from '@api/libs/ensure-dir';
import DatasetDocument from '@api/store/models/dataset/document';
import { joinURL } from 'ufo';

import { BaseProcessor } from './base';

export class CustomProcessor extends BaseProcessor {
  protected document: DatasetDocument;

  constructor({
    knowledgeId,
    documentId,
    sse,
    document,
  }: {
    knowledgeId: string;
    documentId: string;
    sse: any;
    document: DatasetDocument;
  }) {
    super({ knowledgeId, documentId, sse });
    this.document = document;
  }

  protected async saveOriginalFile(): Promise<void> {
    const { data } = this.document;
    if (data?.type !== 'text') {
      throw new Error('document is not a text');
    }

    const { title, content } = data;
    const originalFilePath = joinURL(getUploadDir(this.document.datasetId), `${this.documentId}.txt`);
    await writeFile(originalFilePath, `${title}\n${content}`);
    await this.document.update({ path: `${this.documentId}.txt` });
  }

  protected async ProcessedFile(): Promise<void> {
    const originalFilePath = joinURL(getUploadDir(this.document.datasetId), `${this.documentId}.txt`);
    this.content = await readFile(originalFilePath, 'utf8');
  }
}
