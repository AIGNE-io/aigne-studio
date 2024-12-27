import { createHash } from 'crypto';

import { IVectorStoreManager, VectorStoreContent } from '@aigne/core';
import { BlockletStatus } from '@blocklet/constant';
import { components } from '@blocklet/sdk/lib/config';
import { Document } from 'langchain/document';

import { SEARCH_KIT_DID } from '../constants';
import { AIKitEmbeddings } from '../lib/embeddings/ai-kit';
import logger from '../logger';

const { SearchKitClient, resolveRestEmbedders } = require('@blocklet/search-kit-js');

const fields = ['pageContent', 'id', 'metadata', 'updatedAt'];
const searchableAttributes = ['pageContent', 'id', 'metadata', 'updatedAt'];
const filterableAttributes = ['pageContent', 'id', 'metadata', 'updatedAt'];
const sortableAttributes = ['pageContent', 'id', 'metadata', 'updatedAt'];
const rankingRules = ['sort', 'exactness', 'words', 'typo', 'proximity', 'attribute'];
const POST_SETTING = { searchableAttributes, filterableAttributes, sortableAttributes, rankingRules };

const documentTemplate = `
  A document info:
  {% if doc.id %}
    id: {{ doc.id }}
  {% endif %}
  {% if doc.pageContent %}
    with the following content: {{ doc.pageContent }}
  {% endif %}
  {% assign metadata = doc.metadata %}
  {% if metadata %}
    {% for key in metadata %}
      with metadata: {{ key[0] }}: {{ key[1] }}
    {% endfor %}
  {% endif %}
`;

export default class SearchKitManager implements IVectorStoreManager {
  private client: any;
  protected embeddings = new AIKitEmbeddings();
  protected vectorsFolderPath: string = '';

  static async load(vectorsFolderPath: string) {
    const instance = new SearchKitManager();
    await instance.init(vectorsFolderPath);
    return instance;
  }

  async init(vectorsFolderPath: string) {
    this.vectorsFolderPath = vectorsFolderPath;

    try {
      this.client = new SearchKitClient();
    } catch (e) {
      logger.error('SearchClient constructor error:', e);
    }

    const component = components.find((item: { did: string }) => item.did === SEARCH_KIT_DID);
    if (component && component.status !== BlockletStatus.running) {
      throw new Error('SearchClient not running');
    }

    if (!this.client) {
      throw new Error('SearchClient not initialized');
    }

    const index = this.getIndex();
    const { taskUid } = await this.client.createIndex(index);
    await this.waitForTask(taskUid);

    await this.updateConfig();
  }

  getIndex() {
    const index = createHash('md5').update(this.vectorsFolderPath).digest('hex');
    logger.info('index', { index });
    return `chat-history-${index}`;
  }

  get postIndex() {
    if (!this.client) {
      throw new Error('SearchClient not initialized');
    }

    const index = this.getIndex();
    return this.client.index(index);
  }

  get options() {
    return { primaryKey: 'id' };
  }

  waitForTask(uid: number, { timeOutMs = 1000 * 60 * 10, intervalMs = 1000 } = {}) {
    return this.client!.waitForTask(uid, { timeOutMs, intervalMs });
  }

  async updateEmbedders() {
    try {
      const embedders = resolveRestEmbedders({ documentTemplate, distribution: { mean: 0.6, sigma: 0.4 } });
      const { taskUid } = await this.postIndex.updateEmbedders(embedders);
      logger.debug('updateEmbedders taskUid', taskUid);
    } catch (e) {
      logger.error('updateEmbedders error - downgrade to basic search.', e);
    }
  }

  async updateSettings(settings: {}) {
    await this.postIndex.updateSettings(settings);
  }

  async updateConfig() {
    await this.updateEmbedders();
    await this.updateSettings(POST_SETTING);
  }

  getEmbedders() {
    return this.postIndex.getEmbedders();
  }

  async get(id: string): Promise<VectorStoreContent | null> {
    const result = await this.postIndex.getDocument(id);

    if (result.code) {
      return null;
    }

    return result;
  }

  insert(data: string, id: string, metadata: Record<string, any>): Promise<void> {
    const document = {
      id,
      pageContent: data,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.postIndex.updateDocuments([document], this.options);
  }

  delete(id: string): Promise<void> {
    return this.postIndex.deleteDocuments([id]);
  }

  deleteAll(ids: string[]): Promise<void> {
    return this.postIndex.deleteDocuments(ids);
  }

  update(id: string, data: string, metadata: Record<string, any>): Promise<void> {
    const document = {
      id,
      pageContent: data,
      metadata,
      updatedAt: new Date(),
    };

    return this.postIndex.updateDocuments([document], this.options);
  }

  async list(metadata: Record<string, any>, limit: number = 100): Promise<VectorStoreContent[]> {
    const filter = this.getFilter(metadata);
    return (await this.postIndex.getDocuments({ limit, offset: 0, filter }))?.results;
  }

  async search(query: string, k: number, metadata?: Record<string, any>): Promise<Document[]> {
    const result = await this._search(query, k, metadata, {});
    return result;
  }

  async searchWithScore(query: string, k: number, metadata?: Record<string, any>): Promise<[Document, number][]> {
    const result = await this._search(query, k, metadata, {
      showRankingScore: true,
      showRankingScoreDetails: true,
    });

    return result.map((item: any) => [item, item._rankingScore]);
  }

  private getFilter(metadata?: Record<string, any>) {
    const filter = metadata
      ? Object.entries(metadata).map(([key, value]) => {
          if (Array.isArray(value)) {
            return `metadata.${key} IN [${value.map((v) => JSON.stringify(v)).join(',')}]`;
          }
          return `metadata.${key} = ${JSON.stringify(value)}`;
        })
      : undefined;

    return filter;
  }

  private async _search(query: string, k: number, metadata?: Record<string, any>, options?: {}) {
    const commonParams = {
      ...(!!(await this.getEmbedders()) && { hybrid: { embedder: 'default', semanticRatio: 0.9 } }),
    };

    const modeParams = {
      attributesToCrop: fields,
      cropLength: 10000,
    };

    const filter = this.getFilter(metadata);

    const result = (
      await this.postIndex.search(query, {
        filter: filter,
        sort: ['updatedAt:desc'],
        limit: parseInt(String(k), 10),
        offset: parseInt(String(0), 10),
        attributesToRetrieve: ['*'],
        attributesToHighlight: fields,
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
        rankingScoreThreshold: 0.4,
        ...modeParams,
        ...commonParams,
        ...(options || {}),
      })
    ).hits;

    return result;
  }
}
