import { writeFile } from 'fs/promises';

import { getSourceFileDir } from '@api/libs/ensure-dir';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { exists } from 'fs-extra';
import { cloneDeep } from 'lodash';
import { joinURL } from 'ufo';
import { stringify } from 'yaml';

import { BaseProcessor } from './base';

export class CrawlProcessor extends BaseProcessor {
  protected originalFileName: string = `${this.documentId}.html`;

  protected async saveOriginalFile(): Promise<void> {
    const document = await this.getDocument();

    const { data } = document;
    if (data?.type !== 'crawl') throw new Error('document is not a crawl data');

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
    const originalFilePath = joinURL(getSourceFileDir(this.knowledgeId), this.originalFileName);
    await writeFile(originalFilePath, `${title}\n${content}`);
    await document.update({ path: this.originalFileName, name: title });
  }

  protected async ProcessedFile(): Promise<void> {
    const document = await this.getDocument();
    const { data } = document;

    if (!document.path) {
      throw new Error('get processed file path failed');
    }

    const originalFilePath = joinURL(getSourceFileDir(this.knowledgeId), document.path);
    if (!(await exists(originalFilePath))) {
      throw new Error(`processed file ${originalFilePath} not found`);
    }

    const loader = new CheerioWebBaseLoader(originalFilePath);
    const docs = await loader.load();
    this.content = stringify({
      content: docs.map((doc: any) => doc.pageContent).join('\n'),
      metadata: { documentId: this.documentId, data: cloneDeep(data) },
    });
  }
}
