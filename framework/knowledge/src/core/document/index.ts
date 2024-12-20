import { Document, DocumentParams } from '@aigne/core';

import { addDocumentsToVectorStore, removeDocumentsFromVectorStore } from '../../libs/vector-store';
import KnowledgeDocument from '../../store/models/document';
import { BaseProcessor, BaseProcessorProps } from './base';
import { CrawlProcessor } from './crawl';
import { CustomProcessor } from './custom';
import { DiscussKitProcessor } from './discuss';
import { FileProcessor } from './file';

export class DocumentProcessor extends BaseProcessor {
  constructor({
    knowledgeVectorsFolderPath,
    knowledgeSourcesFolderPath,
    knowledgeProcessedFolderPath,
    knowledgePath,
    did,
    sendToCallback,
  }: BaseProcessorProps) {
    super({
      knowledgeVectorsFolderPath,
      knowledgeSourcesFolderPath,
      knowledgeProcessedFolderPath,
      knowledgePath,
      did,
      sendToCallback,
    });
  }

  static async load(params: BaseProcessorProps) {
    const processor = new DocumentProcessor(params);
    return processor;
  }

  override async saveOriginSource() {
    // ignore
  }

  override async ProcessedFile() {
    // ignore

    return '';
  }

  override async init() {
    // ignore
  }

  override async execute() {
    // ignore
    return { id: '', documents: [] };
  }

  async loaderDocuments(documentParams: DocumentParams) {
    const params = {
      knowledgePath: this.knowledgePath,
      knowledgeVectorsFolderPath: this.knowledgeVectorsFolderPath,
      knowledgeSourcesFolderPath: this.knowledgeSourcesFolderPath,
      knowledgeProcessedFolderPath: this.knowledgeProcessedFolderPath,
      did: this.did,
      sendToCallback: this.sendToCallback,
    };

    if (!documentParams) throw new Error('documentParams is required');

    if (documentParams.type === 'file') {
      return await new FileProcessor({ ...params, file: documentParams.file }).execute();
    }

    if (documentParams.type === 'text') {
      return await new CustomProcessor({
        ...params,
        content: documentParams.content,
        title: documentParams.title,
      }).execute();
    }

    if (documentParams.type === 'discussKit') {
      return await new DiscussKitProcessor({ ...params, data: documentParams.source }).execute();
    }

    if (documentParams.type === 'url') {
      return await new CrawlProcessor({
        ...params,
        url: documentParams.url,
        type: documentParams.crawlType,
        apiKey: documentParams.apiKey,
      }).execute();
    }

    throw new Error(`Unsupported document type: ${(documentParams as any).type}`);
  }

  async getDocuments(params: { [key: string]: any } = {}, page: number = 1, size: number = 20) {
    return {
      total: await KnowledgeDocument.count({ where: params }),
      items: await KnowledgeDocument.findAll({ where: params, offset: (page - 1) * size, limit: size }),
    };
  }

  async addDocuments(documentParams: DocumentParams) {
    const { id, documents } = await this.loaderDocuments(documentParams);

    await addDocumentsToVectorStore({
      storePath: this.knowledgeVectorsFolderPath,
      formattedDocs: documents,
      documentId: id,
    });

    return documents as any;
  }

  async removeDocument(id: string) {
    removeDocumentsFromVectorStore(this.knowledgeVectorsFolderPath, id);

    return await KnowledgeDocument.destroy({ where: { id } });
  }
}
