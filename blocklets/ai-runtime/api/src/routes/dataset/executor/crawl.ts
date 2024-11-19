import { writeFile } from 'fs/promises';

import { getUploadDir } from '@api/libs/ensure-dir';
import DatasetDocument from '@api/store/models/dataset/document';
import { CheerioWebLoader } from 'langchain/document_loaders/web/cheerio';
import { joinURL } from 'ufo';

import { BaseProcessor } from './base';

export class CrawlProcessor extends BaseProcessor {
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
    if (data?.type !== 'crawl') {
      throw new Error('document is not a file');
    }

    const { provider, url, apiKey } = data;
    const map = {
      jina: () => {
        return { url, apiKey, title: '', content: '' };
      },
      firecrawl: () => {
        return { url, apiKey, title: '', content: '' };
      },
    };

    if (!map[provider]) {
      throw new Error(`provider ${provider} not supported`);
    }

    const { title, content } = map[provider]();
    const originalFilePath = joinURL(getUploadDir(this.document.datasetId), `${this.documentId}.html`);
    await writeFile(originalFilePath, `${title}\n\n${content}`);
    await this.document.update({ path: `${this.documentId}.html`, name: title });
  }

  protected async ProcessedFile(): Promise<void> {
    const originalFilePath = joinURL(getUploadDir(this.document.datasetId), `${this.documentId}.html`);
    const loader = new CheerioWebLoader(originalFilePath);
    const docs = await loader.load();
    this.content = docs.map((doc: any) => doc.pageContent).join('\n');
  }
}
