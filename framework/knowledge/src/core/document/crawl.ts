import { writeFile } from 'fs/promises';

import config from '@blocklet/sdk/lib/config';
import FirecrawlApp from '@mendable/firecrawl-js';
import { exists, readFile } from 'fs-extra';
import Joi from 'joi';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { cloneDeep } from 'lodash';
import { joinURL } from 'ufo';
import { parse, stringify } from 'yaml';

import KnowledgeDocument from '../../store/models/document';
import { BaseProcessor, BaseProcessorProps } from './base';

const crawlSchema = Joi.object<{ provider: 'jina' | 'firecrawl'; url: string; apiKey: string }>({
  provider: Joi.string().valid('jina', 'firecrawl').required(),
  url: Joi.string().required(),
  apiKey: Joi.string().required(),
});

export class CrawlProcessor extends BaseProcessor {
  private type: 'jina' | 'firecrawl' = 'jina';
  private apiKey: string = '';
  private url: string = '';

  constructor({
    knowledgeVectorsFolderPath,
    knowledgeSourcesFolderPath,
    knowledgeProcessedFolderPath,
    knowledgePath,
    did,
    sendToCallback,

    type,
    apiKey,
    url,
  }: BaseProcessorProps & {
    type: 'jina' | 'firecrawl';
    apiKey: string;
    url: string;
  }) {
    super({
      knowledgeVectorsFolderPath,
      knowledgeSourcesFolderPath,
      knowledgeProcessedFolderPath,
      knowledgePath,
      did,
      sendToCallback,
    });

    this.type = type;
    this.apiKey = apiKey;
    this.url = url;
  }

  protected async init(): Promise<void> {
    const knowledge = parse(await readFile(this.knowledgePath, 'utf-8'));
    if (!knowledge?.id) throw new Error('knowledge id is not found');

    await crawlSchema.validateAsync({ type: this.type, url: this.url, apiKey: this.apiKey });
  }

  protected async saveOriginSource(): Promise<void> {
    const document = await KnowledgeDocument.create({
      type: 'url',
      name: this.url,
      createdBy: this.did,
      updatedBy: this.did,
      embeddingStatus: 'idle',
      size: 0,
      data: { type: 'url', provider: this.type, url: this.url },
    });
    this.documentId = document.id;

    const { data } = document;
    if (data?.type !== 'url') throw new Error('document is not a url data');

    const { provider, url } = data;
    const map = {
      jina: async () => {
        const response = await fetch(`https://r.jina.ai/${url}`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
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

    const originalFileName = `${document.id}.md`;
    const { title, content } = await map[provider]();
    const originalFilePath = joinURL(this.knowledgeSourcesFolderPath, originalFileName);
    await writeFile(originalFilePath, content);
    await document.update({ filename: originalFileName, name: title });
  }

  protected async ProcessedFile(): Promise<string> {
    const document = await this.getDocument();
    const { data } = document;

    const originalFilePath = joinURL(this.knowledgeSourcesFolderPath, document.filename!);
    if (!(await exists(originalFilePath))) {
      throw new Error(`processed file ${originalFilePath} not found`);
    }

    const loader = new TextLoader(originalFilePath);
    const docs = await loader.load();

    return stringify({
      content: docs.map((doc) => doc.pageContent).join('\n'),
      metadata: { documentId: this.documentId, data: cloneDeep(data) },
    });
  }
}
