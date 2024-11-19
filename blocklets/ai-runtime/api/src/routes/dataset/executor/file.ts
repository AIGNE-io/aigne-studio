import { readFile } from 'fs/promises';

import { getUploadDir } from '@api/libs/ensure-dir';
import logger from '@api/libs/logger';
import DatasetDocument from '@api/store/models/dataset/document';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { exists } from 'fs-extra';
import { joinURL } from 'ufo';

import { BaseProcessor } from './base';

export class FileProcessor extends BaseProcessor {
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
    // @ts-ignore 因为本身就是文件
  }

  protected async ProcessedFile(): Promise<void> {
    // 保存文件内容
    const { data } = this.document;
    if (data?.type !== 'file') {
      throw new Error('Document is not a file');
    }

    const fileExt = data.relativePath.split('.').pop() || '';
    const filePath = joinURL(getUploadDir(this.document.datasetId), this.document.path!);
    if (!(await exists(filePath))) {
      throw new Error(`file ${filePath} not found`);
    }

    logger.info('create file document', {
      name: data.name,
      hash: data.hash,
      relativePath: data.relativePath,
      filePath,
      fileExt,
    });

    const content = await this.loadFile(filePath, fileExt);
    this.content = content;
  }

  private async loadFile(filePath: string, fileType: string): Promise<string> {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return this.loadPdf(filePath);
      case 'docx':
      case 'doc':
        return this.loadDocx(filePath);
      case 'txt':
      case 'md':
      case 'json':
        return this.loadText(filePath);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private async loadPdf(filePath: string): Promise<string> {
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();
    const fullText = docs.map((doc) => doc.pageContent).join('\n');
    return fullText;
  }

  private async loadDocx(filePath: string): Promise<string> {
    const loader = new DocxLoader(filePath);
    const docs = await loader.load();
    const fullText = docs.map((doc) => doc.pageContent).join('\n');
    return fullText;
  }

  private async loadText(filePath: string): Promise<string> {
    return readFile(filePath, 'utf8');
  }
}
