import { writeFile } from 'fs/promises';

import { getSourceFileDir } from '@api/libs/ensure-dir';
import config from '@blocklet/sdk/lib/config';
import FirecrawlApp from '@mendable/firecrawl-js';
import { exists } from 'fs-extra';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { cloneDeep } from 'lodash';
import { joinURL } from 'ufo';
import { stringify } from 'yaml';

import { BaseProcessor } from './base';

export class CrawlProcessor extends BaseProcessor {
  protected originalFileName: string = `${this.documentId}.md`;

  protected async saveOriginalFile(): Promise<void> {
    const document = await this.getDocument();

    const { data } = document;
    if (data?.type !== 'url') throw new Error('document is not a url data');

    const { provider, url } = data;
    const map = {
      jina: async () => {
        const response = await fetch(`https://r.jina.ai/${url}`, {
          headers: { Authorization: `Bearer ${config.env.JINA_API_KEY}` },
        });
        const data = await response.text();

        return {
          title: url,
          content: data,
        };
      },
      firecrawl: async () => {
        const app = new FirecrawlApp({ apiKey: config.env.FIRECRAWL_API_KEY });
        const scrapeResult = (await app.scrapeUrl(url!)) as any;

        return {
          title: url,
          content: scrapeResult?.markdown || '',
        };
      },
    };

    if (!map[provider]) {
      throw new Error(`provider ${provider} not supported`);
    }

    const { title, content } = await map[provider]();
    const originalFilePath = joinURL(getSourceFileDir(this.knowledgeId), this.originalFileName);
    await writeFile(originalFilePath, content);
    await document.update({ filename: this.originalFileName, name: title });
  }

  protected async ProcessedFile(): Promise<void> {
    const document = await this.getDocument();
    const { data } = document;

    const originalFilePath = joinURL(getSourceFileDir(this.knowledgeId), document.filename!);
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
