import { writeFile } from 'fs/promises';

import { getSourceFileDir } from '@api/libs/ensure-dir';
import FirecrawlApp from '@mendable/firecrawl-js';
import { exists } from 'fs-extra';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { cloneDeep } from 'lodash';
import { joinURL } from 'ufo';
import { stringify } from 'yaml';

import { BaseProcessor } from './base';

// jina_3fdb68d24b264d1d8fde5a351cd78317bwlSQ7UV5WG1L6mvfSOz1lJQoHOa
// fc-d033e208cfd14766b50318efbac34616

export class CrawlProcessor extends BaseProcessor {
  protected originalFileName: string = `${this.documentId}.md`;

  protected async saveOriginalFile(): Promise<void> {
    const document = await this.getDocument();

    const { data } = document;
    if (data?.type !== 'crawl') throw new Error('document is not a crawl data');

    const { provider, url, apiKey } = data;
    const map = {
      jina: async () => {
        const response = await fetch(`https://r.jina.ai/${url}`, { headers: { Authorization: `Bearer ${apiKey}` } });
        const data = await response.text();

        return {
          title: url,
          content: data,
        };
      },
      firecrawl: async () => {
        const app = new FirecrawlApp({ apiKey });
        const scrapeResult = (await app.scrapeUrl(url!)) as any;

        return {
          title: scrapeResult?.metadata?.title || url,
          content: scrapeResult?.markdown || '',
        };
      },
    };

    if (!map[provider]) {
      throw new Error(`provider ${provider} not supported`);
    }

    const { title, content } = await map[provider]();
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

    const loader = new TextLoader(originalFilePath);
    const docs = await loader.load();

    this.content = stringify({
      content: docs.map((doc) => doc.pageContent).join('\n'),
      metadata: { documentId: this.documentId, data: cloneDeep(data) },
    });
  }
}
