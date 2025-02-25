import { readFile } from 'fs/promises';

import { getSourceFileDir } from '@api/libs/ensure-dir';
import { NotFoundError } from '@api/libs/error';
import logger from '@api/libs/logger';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { exists } from 'fs-extra';
import { cloneDeep } from 'lodash';
import { joinURL } from 'ufo';
import { stringify } from 'yaml';

import { BaseProcessor } from './base';

export class FileProcessor extends BaseProcessor {
  protected async saveOriginalFile(): Promise<void> {
    // @ts-ignore 因为本身就是文件
  }

  protected async ProcessedFile(): Promise<void> {
    const document = await this.getDocument();

    // 保存文件内容
    const { data } = document;
    if (data?.type !== 'file') {
      throw new Error('Document is not a file');
    }

    const filePath = joinURL(getSourceFileDir(this.knowledgeId), document.filename!);
    if (!(await exists(filePath))) {
      throw new NotFoundError(`processed file ${filePath} not found`);
    }

    const fileExt = (document.name || '').split('.').pop() || '';

    const content = await this.loadFile(filePath, fileExt);
    this.content = stringify({
      content,
      metadata: {
        documentId: this.documentId,
        data: cloneDeep({
          type: document.data?.type,
          name: document.name,
          filename: document.filename,
          size: document.size,
        }),
      },
    });
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
        logger.warn(`Unsupported file type: ${fileType}`);
        return this.loadText(filePath);
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
