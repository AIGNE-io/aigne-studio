import { MemorySortOptions } from '@aigne/core';
import { LRUCache } from 'lru-cache';

import { Retrievable, VectorStoreDocument, VectorStoreSearchOptions } from '../core/type';
import { AIKitEmbeddings } from '../lib/embeddings/ai-kit';
import logger from '../logger';
import DefaultVectorHistoryStore from '../storage/content';

const { SearchKitClient, resolveRestEmbedders } = require('@blocklet/search-kit-js');

const fields = ['id', 'createdAt', 'updatedAt', 'userId', 'sessionId', 'memory', 'metadata'];
const searchableAttributes = ['id', 'createdAt', 'updatedAt', 'userId', 'sessionId', 'memory', 'metadata'];
const filterableAttributes = ['id', 'createdAt', 'updatedAt', 'userId', 'sessionId', 'memory', 'metadata'];
const sortableAttributes = ['id', 'createdAt', 'updatedAt', 'userId', 'sessionId', 'memory', 'metadata'];
const rankingRules = ['sort', 'exactness', 'words', 'typo', 'proximity', 'attribute'];
const POST_SETTING = { searchableAttributes, filterableAttributes, sortableAttributes, rankingRules };

const documentTemplate = `
  A document info:
  {% if doc.id %}
    id: {{ doc.id }}
  {% endif %}
  {% if doc.memory %}
    with the following content: {{ doc.memory }}
  {% endif %}
  {% assign metadata = doc.metadata %}
  {% if metadata %}
    {% for key in metadata %}
      with metadata: {{ key[0] }}: {{ key[1] }}
    {% endfor %}
  {% endif %}
`;

const stores = new Map<string, SearchKitRetriever<any>>();

const cache = new LRUCache<string, SearchKitRetriever<any>>({
  max: Number(process.env.AIGNE_MEMORY_SEARCH_KIT_STORE_CACHE_MAX) || 500,
  ttl: Number(process.env.AIGNE_MEMORY_SEARCH_KIT_STORE_CACHE_TTL) || 60e3,
});

export default class SearchKitRetriever<T> implements Retrievable<T> {
  static load<T>({ path, id }: { path: string; id: string }) {
    let store = cache.get(id);
    if (!store) {
      store = new SearchKitRetriever<T>({ id, path });
      cache.set(id, store);
    }
    return store as SearchKitRetriever<T>;
  }

  // TODO: should inject embeddings from runtime
  protected embeddings = new AIKitEmbeddings();

  protected historyStore: DefaultVectorHistoryStore;

  constructor(public config: { id: string; path: string }) {
    this.historyStore = new DefaultVectorHistoryStore(this.config.path);
  }

  private _init?: Promise<any>;

  async init() {
    this._init ??= (async () => {
      const client = new SearchKitClient();

      const rowInfo = await (await this.postIndex).getRawInfo().catch(() => null);

      if (!rowInfo?.uid) {
        const { taskUid } = await client.createIndex(this.config.id);
        await this.waitForTask(taskUid);
        await this.initIndexFromHistory();
      }

      await this.updateConfig();

      return client;
    })();

    return this._init;
  }

  get postIndex() {
    return this.init().then((client) => client.index(this.config.id));
  }

  get options() {
    return { primaryKey: 'id' };
  }

  private async initIndexFromHistory({ size = 2000 } = {}) {
    // TODO: 分页处理，避免一次性查询过多数据
    const list = await this.historyStore.findAll({});

    const ids = list.map((x) => x.id);
    const total = ids.length;

    const length = Math.ceil(total / size);
    const batches = Array.from({ length }, (_, i) => ids.slice(i * size, (i + 1) * size));

    const tasks = [];
    for (const batch of batches) {
      const { taskUid } = await this.updatePosts(batch);
      logger.info(`batch taskUid: ${taskUid}`);
      tasks.push(taskUid);
    }

    return tasks;
  }

  private async updatePosts(ids: string[]) {
    const documents = await this.historyStore?.findAll({ id: { $in: ids } });
    const result = await (await this.postIndex).updateDocuments(documents, this.options);
    return result;
  }

  private async waitForTask(uid: number, { timeOutMs = 1000 * 60 * 10, intervalMs = 1000 } = {}) {
    const client = await this.init();

    return client.waitForTask(uid, { timeOutMs, intervalMs });
  }

  private async updateEmbedders() {
    try {
      const embedders = resolveRestEmbedders({ documentTemplate, distribution: { mean: 0.7, sigma: 0.3 } });
      const { taskUid } = await (await this.postIndex).updateEmbedders(embedders);
      logger.debug('updateEmbedders taskUid', taskUid);
    } catch (e) {
      logger.error('updateEmbedders error - downgrade to basic search.', e);
    }
  }

  private async updateConfig() {
    await this.updateSettings(POST_SETTING);
    await this.updateEmbedders();
  }

  private async updateSettings(settings: {}) {
    await (await this.postIndex).updateSettings(settings);
  }

  private async getEmbedders() {
    return (await this.postIndex).getEmbedders();
  }

  async get(id: string): Promise<VectorStoreDocument<T> | null> {
    const result = await (await this.postIndex).getDocument(id);

    if (result.code) return null;

    return result;
  }

  async insert(document: VectorStoreDocument<T>): Promise<void> {
    await this.historyStore.add(document).catch((e) => {
      logger.error('Error adding origin content', e);
    });

    const result = await (await this.postIndex).updateDocuments([document], this.options);
    await this.waitForTask(result.taskUid);
  }

  async delete(id: string): Promise<void> {
    await this.historyStore.delete(id).catch((e) => {
      logger.error('Error deleting origin content', e);
    });

    const result = await (await this.postIndex).deleteDocuments([id]);
    await this.waitForTask(result.taskUid);
  }

  async deleteAll(ids: string[]): Promise<void> {
    const result = await (await this.postIndex).deleteDocuments(ids);
    await this.waitForTask(result.taskUid);
  }

  async update(document: VectorStoreDocument<T>): Promise<void> {
    await this.historyStore.update(document).catch((e) => {
      logger.error('Error updating origin content', e);
    });

    const result = await (await this.postIndex).updateDocuments([document], this.options);
    await this.waitForTask(result.taskUid);
  }

  private getSort(sort?: MemorySortOptions) {
    if (!sort) return undefined;
    return (Array.isArray(sort) ? sort : [sort]).map((i) => `${i.field}:${i.direction}`);
  }

  async list(k: number, options?: VectorStoreSearchOptions): Promise<VectorStoreDocument<T>[]> {
    return this.search('', k, options);
  }

  async searchWithScore(
    query: string,
    k: number,
    options?: VectorStoreSearchOptions
  ): Promise<[VectorStoreDocument<T>, number][]> {
    const result = await this.search(query, k, {
      ...options,
      searchKitOptions: {
        showRankingScore: true,
        showRankingScoreDetails: true,
        sort: options?.sort,
      },
    });
    return result.map((item: any) => [item, item._rankingScore]);
  }

  async search(
    query: string,
    k: number,
    options?: VectorStoreSearchOptions & { searchKitOptions?: object }
  ): Promise<VectorStoreDocument<T>[]> {
    const commonParams = {
      // TODO: 每次 search 都会先查询 embedders，可以不用检查，或者缓存检查结果？
      ...(!!(await this.getEmbedders()) && { hybrid: { embedder: 'default', semanticRatio: 0.5 } }),
    };

    const modeParams = {
      attributesToCrop: fields,
      cropLength: 10000,
    };

    const filter = options?.filter ?? {};

    const sort = this.getSort(options?.sort);

    const index = await this.postIndex;

    const result = await index.search(query, {
      filter,
      limit: k,
      offset: 0,
      attributesToRetrieve: ['*'],
      attributesToHighlight: fields,
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      // rankingScoreThreshold: 0.1,
      ...modeParams,
      ...commonParams,
      ...options?.searchKitOptions,
      sort,
    }).hits;

    return result;
  }
}
