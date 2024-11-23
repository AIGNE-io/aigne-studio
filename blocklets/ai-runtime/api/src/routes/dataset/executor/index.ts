import logger from '../../../libs/logger';
import KnowledgeDocument from '../../../store/models/dataset/document';
import { BaseProcessor } from './base';
import { CrawlProcessor } from './crawl';
import { CustomProcessor } from './custom';
import { DiscussKitProcessor } from './discuss';
import { FileProcessor } from './file';

export class PipelineProcessor extends BaseProcessor {
  override async saveOriginalFile() {
    // ignore
  }

  override async ProcessedFile() {
    // ignore
  }

  override async execute(): Promise<any> {
    const { knowledgeId, documentId, sse, update } = this;

    const document = await KnowledgeDocument.findOne({ where: { id: documentId, knowledgeId } });

    switch (document?.type) {
      case 'file': {
        return new FileProcessor({ knowledgeId, documentId, sse, update }).execute();
      }
      case 'text': {
        return new CustomProcessor({ knowledgeId, documentId, sse, update }).execute();
      }
      case 'discussKit': {
        return new DiscussKitProcessor({ knowledgeId, documentId, sse, update }).execute();
      }
      case 'url': {
        return new CrawlProcessor({ knowledgeId, documentId, sse, update }).execute();
      }
      default: {
        logger.error('Unsupported document type', { document });
        throw new Error(`Unsupported document type: ${(document as any)?.type}`);
      }
    }
  }
}
