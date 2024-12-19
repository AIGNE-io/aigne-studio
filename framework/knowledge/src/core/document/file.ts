import { readFile } from 'fs/promises';

import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { exists, writeFile } from 'fs-extra';
import Joi from 'joi';
import { cloneDeep } from 'lodash';
import { joinURL } from 'ufo';
import { parse, stringify } from 'yaml';

import logger from '../../logger';
import KnowledgeDocument from '../../store/models/document';
import { BaseProcessor } from './base';

const fileSchema = Joi.object<{
  name: string;
  size: number;
}>({
  name: Joi.string().allow('').default('').required(),
  size: Joi.number().required(),
});

export class FileProcessor extends BaseProcessor {
  private file: File;

  constructor({
    knowledgeVectorsFolderPath,
    knowledgeSourcesFolderPath,
    knowledgeProcessedFolderPath,
    knowledgePath,
    file,
    did,
  }: {
    knowledgeVectorsFolderPath: string;
    knowledgeSourcesFolderPath: string;
    knowledgeProcessedFolderPath: string;
    knowledgePath: string;
    file: File;
    did: string;
  }) {
    super({ knowledgeVectorsFolderPath, knowledgeSourcesFolderPath, knowledgeProcessedFolderPath, knowledgePath, did });

    this.file = file;
  }

  protected async init(): Promise<void> {
    const knowledge = parse(await readFile(this.knowledgePath, 'utf-8'));
    if (!knowledge?.id) throw new Error('knowledge id is not found');

    await fileSchema.validateAsync(this.file, { stripUnknown: true });
  }

  protected async saveOriginSource(): Promise<void> {
    const knowledge = parse(await readFile(this.knowledgePath, 'utf-8'));

    const fileBuffer = await this.file.arrayBuffer().then((buffer) => Buffer.from(buffer));
    await writeFile(joinURL(this.knowledgeSourcesFolderPath, this.file.name), fileBuffer);

    const filename = this.file.name;
    const size = this.file.size;

    const document = await KnowledgeDocument.create({
      type: 'file',
      name: filename,
      knowledgeId: knowledge.id,
      createdBy: this.did,
      updatedBy: this.did,
      embeddingStatus: 'idle',
      filename,
      size,
      data: { type: 'file' },
    });

    this.documentId = document.id;
  }

  protected async ProcessedFile(): Promise<string> {
    const document = await this.getDocument();

    // 保存文件内容
    const { data } = document;
    if (data?.type !== 'file') {
      throw new Error('Document is not a file');
    }

    const filePath = joinURL(this.knowledgeSourcesFolderPath, document.filename!);
    if (!(await exists(filePath))) {
      throw new Error(`processed file ${filePath} not found`);
    }

    const fileExt = (document.name || '').split('.').pop() || '';

    const content = await this.loadFile(filePath, fileExt);
    return stringify({
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
