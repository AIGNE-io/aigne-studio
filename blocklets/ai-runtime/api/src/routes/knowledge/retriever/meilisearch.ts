/* eslint-disable no-await-in-loop */
import { hash } from 'crypto';

import logger from '@api/libs/logger';
import { Document } from '@langchain/core/documents';

import { AIKitEmbeddings } from '../../../core/embeddings/ai-kit';
import Segment from '../../../store/models/dataset/segment';
import VectorStore from '../../../store/vector-store-faiss';
import { retry, sleep } from '../util';

const searchableAttributes = ['pageContent'];
const filterableAttributes = ['pageContent'];
const sortableAttributes = ['pageContent'];
const rankingRules = ['sort', 'exactness', 'words', 'typo', 'proximity', 'attribute'];
const POST_SETTING = { searchableAttributes, filterableAttributes, sortableAttributes, rankingRules };

const { SearchKitClient, resolveRestEmbedders } = require('@blocklet/search-kit-js');

const documentTemplate = `
  with the following content: {{ doc.pageContent }}
`;

export default class SearchClient {
  private client: any = null;

  protected embeddings = new AIKitEmbeddings();

  constructor(
    private knowledgeId: string,
    private vectorPathOrKnowledgeId: string
  ) {
    try {
      this.client = new SearchKitClient();
    } catch (e) {
      logger.error('SearchClient constructor error:', e);
    }
  }

  get canUse() {
    return !!this.client;
  }

  get postIndex() {
    if (!this.client) {
      throw new Error('SearchClient not initialized');
    }

    return this.client.index(this.knowledgeId);
  }

  get options() {
    // fix: boardId and id conflict https://www.meilisearch.com/docs/learn/core_concepts/primary_key#index_primary_key_multiple_candidates_found
    return { primaryKey: 'id' };
  }

  async init(deepClear: boolean = false) {
    try {
      const { postIndex } = this;

      if (deepClear) {
        logger.debug('Clear old post data');
        const { taskUid } = await postIndex.deleteAllDocuments();
        await this.waitForTask(taskUid);
      }

      await this.batchIndexPosts();
    } catch (e) {
      logger.error('initData error', e);
      throw e;
    }
  }

  waitForTask(uid: number, { timeOutMs = 1000 * 10, intervalMs = 300 } = {}) {
    return this.client!.waitForTask(uid, { timeOutMs, intervalMs });
  }

  async formatDocuments(documents: Document[]) {
    const list = documents.map((doc) => {
      try {
        const parsedContent = JSON.parse(doc.pageContent);

        if (typeof parsedContent.content === 'string') {
          try {
            const content = JSON.parse(parsedContent.content);

            return { content: content.content, doc };
          } catch (e) {
            return { content: parsedContent.content, doc };
          }
        }

        return { content: parsedContent.content, doc };
      } catch {
        return { doc };
      }
    });
    const posts = list.map(({ doc, content }) => ({ ...doc, id: hash('md5', (content || '').trim(), 'hex') }));

    return posts;
  }

  // https://www.meilisearch.com/docs/learn/indexing/indexing_best_practices#prefer-bigger-http-payloads
  async batchIndexPosts(size = 10000) {
    const vectorStore = await VectorStore.load(this.vectorPathOrKnowledgeId, this.embeddings);
    const { length } = Object.keys(vectorStore.getMapping());
    if (length === 0) return;

    const docs = await vectorStore.similaritySearch(' ', length);
    const total = length;
    let processed = 0;
    while (processed < total) {
      logger.debug(`index posts: {skip=${processed}, total=${total}, size=${size}`);

      const documents = docs.slice(processed, processed + size);
      const posts = await this.formatDocuments(documents);
      const { taskUid } = await this.postIndex.addDocuments(posts, this.options);
      logger.debug(`index posts taskUid: ${taskUid}`);
      await sleep(5000);
      processed += documents.length;
    }
  }

  search(
    text: string,
    { limit = 10, offset = 0, ...rest }: { limit?: number; offset?: number; [key: string]: any } = {}
  ) {
    return this.postIndex.search(text, { limit, offset, ...rest });
  }

  async addPosts(documents: Document[]) {
    const existPostIndex = await this.checkPostIndexExist();
    if (!existPostIndex) {
      await this.init();
    }

    const res = await this.postIndex.addDocuments(await this.formatDocuments(documents), this.options);
    return res;
  }

  async updatePosts(documents: Document[]) {
    const existPostIndex = await this.checkPostIndexExist();
    if (!existPostIndex) {
      await this.init();
    }

    const res = await this.postIndex.updateDocuments(await this.formatDocuments(documents), this.options);
    return res;
  }

  removePost(ids: string[]) {
    return this.postIndex.deleteDocuments(ids);
  }

  async checkPostIndexExist() {
    try {
      return !!(await this.postIndex.getRawInfo());
    } catch (error) {
      return false;
    }
  }

  getEmbedders() {
    return this.postIndex.getEmbedders();
  }

  async updateEmbedders() {
    try {
      const embedders = resolveRestEmbedders({ documentTemplate });
      const { taskUid } = await this.postIndex.updateEmbedders(embedders);
      logger.debug(`updateEmbedders taskUid: ${taskUid}`);
    } catch (e) {
      logger.error('updateEmbedders error - downgrade to basic search.', e);
    }
  }

  async resetEmbedders() {
    try {
      const { taskUid } = await this.postIndex.resetEmbedders();
      logger.debug(`resetEmbedders taskUid: ${taskUid}`);
    } catch (e) {
      logger.error('resetEmbedders error', e);
    }
  }

  async updateSettings(settings: any) {
    await this.postIndex.updateSettings(settings);
  }

  async checkUpdate() {
    const upsert = async () => {
      if (!this.client) {
        throw new Error('No SearchKitClient instance');
      }

      const existPostIndex = await this.checkPostIndexExist();
      logger.debug(`exist post index: ${existPostIndex}`);

      if (!existPostIndex) {
        await this.updateEmbedders();
        await this.updateSettings(POST_SETTING);
        await this.init();
        return;
      }

      // No significant MeiliSearch overhead if embedders or settings are unchanged.
      await this.updateEmbedders();
      await this.updateSettings(POST_SETTING);
    };

    try {
      await retry(upsert, 3, 3000);
    } catch (err) {
      logger.error('checkUpdate error:', err);
    }
  }
}

export class KnowledgeSearchClient extends SearchClient {
  constructor(knowledgeId: string) {
    super(knowledgeId, knowledgeId);
  }

  async update(documents: Document[]) {
    await this.updatePosts(documents);
  }

  async remove(documentId: string) {
    const { rows: messages } = await Segment.findAndCountAll({ where: { documentId } });
    const ids = messages.map((x) => hash('md5', (x.content || '').trim(), 'hex'));
    if (ids.length <= 0) return;

    await this.removePost(ids);
  }
}
