import { BlockletStatus } from '@blocklet/constant';
import { components } from '@blocklet/sdk/lib/config';
import { Document } from 'langchain/document';

import { SEARCH_KIT_DID } from '../constants';
import { AIKitEmbeddings } from '../lib/embeddings/ai-kit';
import logger from '../logger';
import SQLiteContentManager from '../storage/content';
import { IVectorStoreManager, VectorStoreContent } from '../types/memory';

const { SearchKitClient, resolveRestEmbedders } = require('@blocklet/search-kit-js');

const fields = ['pageContent', 'id', 'metadata', 'updatedAt'];
const searchableAttributes = ['pageContent', 'id', 'metadata', 'updatedAt'];
const filterableAttributes = ['pageContent', 'id', 'metadata', 'updatedAt'];
const sortableAttributes = ['pageContent', 'id', 'metadata', 'updatedAt'];
const rankingRules = ['exactness', 'words', 'typo', 'proximity', 'attribute'];
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

  protected indexId: string = '';

  protected contentManager?: SQLiteContentManager;

  static async load(dbPath: string, id: string) {
    const instance = new SearchKitManager();
    await instance.init(dbPath, id);
    return instance;
  }

  async init(dbPath: string, indexId: string) {
    this.indexId = indexId;

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

    // this.contentManager = await SQLiteContentManager.load(dbPath);

    const rowInfo = await this.postIndex.getRawInfo().catch(() => null);
    if (!rowInfo?.uid) {
      const { taskUid } = await this.client.createIndex(this.indexId);
      await this.waitForTask(taskUid);
      await this.batchIndexPosts();
    }

    await this.updateConfig();
  }

  get postIndex() {
    if (!this.client) {
      throw new Error('SearchClient not initialized');
    }

    return this.client.index(this.indexId);
  }

  get options() {
    return { primaryKey: 'id' };
  }

  async batchIndexPosts({ size = 2000 } = {}) {
    const models =
      (await this.contentManager?.getOriginContent({}).catch(() => {
        return [];
      })) || [];

    const postIds = models.map((x) => x.id);
    const total = postIds.length;

    const length = Math.ceil(total / size);
    const batches = Array.from({ length }, (_, i) => postIds.slice(i * size, (i + 1) * size));

    const tasks = [];
    for (const batch of batches) {
      const { taskUid } = await this.updatePosts(batch);
      logger.info(`batch taskUid: ${taskUid}`);
      tasks.push(taskUid);
    }

    return tasks;
  }

  private async updatePosts(ids: string[]) {
    const documents = await this.contentManager?.getOriginContent({ id: { $in: ids } });
    const result = await this.postIndex.updateDocuments(documents, this.options);
    return result;
  }

  waitForTask(uid: number, { timeOutMs = 1000 * 60 * 10, intervalMs = 1000 } = {}) {
    return this.client!.waitForTask(uid, { timeOutMs, intervalMs });
  }

  async updateEmbedders() {
    try {
      const embedders = resolveRestEmbedders({ documentTemplate, distribution: { mean: 0.7, sigma: 0.3 } });
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
    await this.updateSettings(POST_SETTING);
    await this.updateEmbedders();
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

  async insert(data: string, id: string, metadata: Record<string, any>): Promise<void> {
    const document = {
      id,
      pageContent: data,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.contentManager?.addOriginContent(id, data, metadata).catch((e) => {
      logger.error('Error adding origin content', e);
    });

    const result = await this.postIndex.updateDocuments([document], this.options);
    await this.waitForTask(result.taskUid);
    return result;
  }

  async delete(id: string): Promise<void> {
    await this.contentManager?.deleteOriginContent(id).catch((e) => {
      logger.error('Error deleting origin content', e);
    });

    const result = await this.postIndex.deleteDocuments([id]);
    await this.waitForTask(result.taskUid);
    return result;
  }

  async deleteAll(ids: string[]): Promise<void> {
    const result = await this.postIndex.deleteDocuments(ids);
    await this.waitForTask(result.taskUid);
    return result;
  }

  async update(id: string, data: string, metadata: Record<string, any>): Promise<void> {
    const document = {
      id,
      pageContent: data,
      metadata,
      updatedAt: new Date(),
    };

    await this.contentManager?.updateOriginContent(id, data, metadata).catch((e) => {
      logger.error('Error updating origin content', e);
    });

    const result = await this.postIndex.updateDocuments([document], this.options);
    await this.waitForTask(result.taskUid);
    return result;
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
    const result = await this._search(query, k, metadata, { showRankingScore: true, showRankingScoreDetails: true });

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

  private async _search(query: string, k: number, metadata?: Record<string, any>, options?: { [key: string]: any }) {
    const commonParams = {
      ...(!!(await this.getEmbedders()) && { hybrid: { embedder: 'default', semanticRatio: 0.5 } }),
    };

    const modeParams = {
      attributesToCrop: fields,
      cropLength: 10000,
    };

    const filter = this.getFilter(metadata);

    const result = (
      await this.postIndex.search(query, {
        filter,
        limit: parseInt(String(k), 10),
        offset: parseInt(String(0), 10),
        attributesToRetrieve: ['*'],
        attributesToHighlight: fields,
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
        // rankingScoreThreshold: 0.1,
        ...modeParams,
        ...commonParams,
        ...(options || {}),
      })
    ).hits;

    return result;
  }
}
