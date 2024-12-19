import { CreateDiscussionItem } from '@aigne/core';

import { addDocumentsToVectorStore, removeDocumentsFromVectorStore } from '../../libs/vector-store';
import logger from '../../logger';
import KnowledgeDocument from '../../store/models/document';
import { BaseProcessor } from './base';
import { CrawlProcessor } from './crawl';
import { CustomProcessor } from './custom';
import { DiscussKitProcessor } from './discuss';
import { FileProcessor } from './file';

export class DocumentProcessor extends BaseProcessor {
  private type: 'file' | 'text' | 'discussKit' | 'url';
  private file?: File;
  private content?: string;
  private title?: string;
  private data?: CreateDiscussionItem;
  private url?: string;
  private crawlType?: 'jina' | 'firecrawl';
  private apiKey?: string;

  constructor({
    knowledgeVectorsFolderPath,
    knowledgeSourcesFolderPath,
    knowledgeProcessedFolderPath,
    knowledgePath,
    did,
    sendToRelay,

    type,
    file,
    content,
    title,
    data,
    url,
    crawlType,
    apiKey,
  }: {
    knowledgeVectorsFolderPath: string;
    knowledgeSourcesFolderPath: string;
    knowledgeProcessedFolderPath: string;
    knowledgePath: string;
    did: string;
    sendToRelay: (...args: any[]) => void;

    type: 'file' | 'text' | 'discussKit' | 'url';
    file?: File;
    content?: string;
    title?: string;
    data?: CreateDiscussionItem;
    url?: string;
    crawlType?: 'jina' | 'firecrawl';
    apiKey?: string;
  }) {
    super({
      knowledgeVectorsFolderPath,
      knowledgeSourcesFolderPath,
      knowledgeProcessedFolderPath,
      knowledgePath,
      did,
      sendToRelay,
    });

    this.type = type;
    this.file = file;
    this.content = content;
    this.title = title;
    this.data = data;
    this.url = url;
    this.crawlType = crawlType;
    this.apiKey = apiKey;
  }

  override async saveOriginSource() {
    // ignore
  }

  override async ProcessedFile() {
    return '';
  }

  override async init() {
    // ignore
  }

  override async load() {
    const params = {
      knowledgePath: this.knowledgePath,
      knowledgeVectorsFolderPath: this.knowledgeVectorsFolderPath,
      knowledgeSourcesFolderPath: this.knowledgeSourcesFolderPath,
      knowledgeProcessedFolderPath: this.knowledgeProcessedFolderPath,
      did: this.did,
    };

    switch (this.type) {
      case 'file': {
        return new FileProcessor({ ...params, file: this.file! }).load();
      }
      case 'text': {
        return new CustomProcessor({ ...params, content: this.content!, title: this.title! }).load();
      }
      case 'discussKit': {
        return new DiscussKitProcessor({ ...params, data: this.data! }).load();
      }
      case 'url': {
        return new CrawlProcessor({
          ...params,
          url: this.url!,
          type: this.crawlType!,
          apiKey: this.apiKey!,
        }).load();
      }
      default: {
        logger.error('Unsupported document type', { document });
        throw new Error(`Unsupported document type: ${(document as any)?.type}`);
      }
    }
  }

  async getDocuments(params: { [key: string]: any } = {}, page: number = 1, size: number = 20) {
    return KnowledgeDocument.findAll({ where: params, offset: (page - 1) * size, limit: size });
  }

  async addDocuments() {
    const { id, documents } = await this.load();

    await addDocumentsToVectorStore({
      storePath: this.knowledgeVectorsFolderPath,
      formattedDocs: documents,
      documentId: id,
    });

    return documents;
  }

  async removeDocuments(ids: string[]) {
    await Promise.all(ids.map((id) => removeDocumentsFromVectorStore(this.knowledgeVectorsFolderPath, id)));
  }
}
