/* eslint-disable no-await-in-loop */
import { join } from 'path';

import logger from '@api/libs/logger';
import { Document } from '@langchain/core/documents';
import { pathExists, readFile } from 'fs-extra';

import { AIKitEmbeddings } from '../../../../core/embeddings/ai-kit';
import Segment from '../../../../store/models/dataset/segment';
import VectorStore from '../../../../store/vector-store-faiss';
import { getId, retry, sleep } from '../../util';

const searchableAttributes = ['pageContent', 'knowledgeId'];
const filterableAttributes = ['pageContent', 'knowledgeId'];
const sortableAttributes = ['pageContent', 'knowledgeId'];
const rankingRules = ['sort', 'exactness', 'words', 'typo', 'proximity', 'attribute'];
const POST_SETTING = { searchableAttributes, filterableAttributes, sortableAttributes, rankingRules };
const { SearchKitClient, resolveRestEmbedders } = require('@blocklet/search-kit-js');

const documentTemplate = `
  with the following content: {{ doc.pageContent }}
`;

export default class SearchClient {
  private client: any = null;

  protected embeddings = new AIKitEmbeddings();

  protected POST_INDEX_NAME: string;

  constructor(protected knowledgeId: string) {
    try {
      this.client = new SearchKitClient();
    } catch (e) {
      logger.error('SearchClient constructor error:', e);
    }

    this.POST_INDEX_NAME = `${process.env.BLOCKLET_APP_ID}-${knowledgeId}`;
  }

  get canUse() {
    return !!this.client;
  }

  get postIndex() {
    if (!this.client) {
      throw new Error('SearchClient not initialized');
    }

    return this.client.index(this.POST_INDEX_NAME);
  }

  // fix: boardId and id conflict https://www.meilisearch.com/docs/learn/core_concepts/primary_key#index_primary_key_multiple_candidates_found
  get options() {
    return { primaryKey: 'id' };
  }

  async init({ deepClear = false, vectorPathOrKnowledgeId }: { deepClear?: boolean; vectorPathOrKnowledgeId: string }) {
    try {
      if (deepClear) {
        logger.debug('Clear old post data');
        const { taskUid } = await this.postIndex.deleteAllDocuments();
        await this.waitForTask(taskUid);
      }

      await this.batchIndexPosts({ vectorPathOrKnowledgeId });
    } catch (e) {
      logger.error('init data error', e);
      throw e;
    }
  }

  async getDocumentsCount() {
    try {
      const stats = await this.postIndex.getStats();
      return stats.numberOfDocuments;
    } catch (error) {
      return 0;
    }
  }

  waitForTask(uid: number, { timeOutMs = 1000 * 60 * 10, intervalMs = 1000 } = {}) {
    return this.client!.waitForTask(uid, { timeOutMs, intervalMs });
  }

  formatDocuments(documents: Document[]) {
    const list = documents.map((doc) => ({
      content: doc?.pageContent || '',
      doc: { ...doc, pageContent: doc?.pageContent || '' },
    }));

    const posts = list.map(({ doc, content }) => ({
      ...doc,
      knowledgeId: this.knowledgeId,
      id: getId(this.knowledgeId, content),
    }));

    return posts;
  }

  // https://www.meilisearch.com/docs/learn/indexing/indexing_best_practices#prefer-bigger-http-payloads
  async batchIndexPosts({ size = 10000, vectorPathOrKnowledgeId }: { size?: number; vectorPathOrKnowledgeId: string }) {
    logger.debug('batchIndexPosts start', { vectorPathOrKnowledgeId });

    let docs = [];
    try {
      const docstore = join(vectorPathOrKnowledgeId, 'docstore.json');
      if (await pathExists(docstore)) {
        const [list] = JSON.parse(await readFile(docstore, 'utf-8'));
        docs = list.map((i: [string, object]) => i[1]);
      }
    } catch (error) {
      logger.error(`read docstore error: ${error}`);
      const vectorStore = await VectorStore.load(vectorPathOrKnowledgeId, this.embeddings);
      const { length } = Object.keys(vectorStore.getMapping());
      docs = length > 0 ? await vectorStore.similaritySearch(' ', length) : [];
    }

    let processed = 0;
    const total = docs.length;
    if (total === 0) return;

    while (processed < total) {
      logger.debug(`index posts: {skip=${processed}, total=${total}, size=${size}`);
      const documents = docs.slice(processed, processed + size);
      const { taskUid } = await this.updatePosts(documents);
      logger.debug(`index posts taskUid: ${taskUid}`);
      await sleep(5000);
      processed += documents.length;
    }

    logger.debug('batchIndexPosts done', { vectorPathOrKnowledgeId });
  }

  search(
    text: string,
    { limit = 10, offset = 0, ...rest }: { limit?: number; offset?: number; [key: string]: any } = {}
  ) {
    return this.postIndex.search(text, { limit, offset, ...rest });
  }

  async updatePosts(documents: Document[]) {
    const list = this.formatDocuments(documents);
    const result = await this.postIndex.updateDocuments(list, this.options);
    return result;
  }

  removePosts(ids: string[]) {
    return this.postIndex.deleteDocuments(ids);
  }

  async checkPostIndexExist() {
    try {
      const rawInfo = await this.postIndex.getRawInfo();
      return { isExist: !!rawInfo };
    } catch (error) {
      return { isExist: false };
    }
  }

  async isNotExit() {
    const existPostIndex = await this.checkPostIndexExist();
    logger.debug(`exist post index: ${existPostIndex}`);

    return !existPostIndex.isExist;
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

  async checkUpdate(vectorPathOrKnowledgeId: string) {
    const upsert = async () => {
      if (!this.client) {
        throw new Error('No SearchKitClient instance');
      }

      const notExistPostIndex = await this.isNotExit();
      if (notExistPostIndex) {
        logger.debug('notExistPostIndex', { knowledgeId: this.knowledgeId });
        await this.updateConfig();
        await this.init({ vectorPathOrKnowledgeId });
        return;
      }

      await this.init({ vectorPathOrKnowledgeId });
    };

    await retry(upsert, 3, 3000).catch((err) => logger.error('checkUpdate error:', err));
  }

  async clearAllTasks() {
    const { taskUid } = await this.client.deleteTasks({ indexUids: [this.POST_INDEX_NAME] });
    await this.waitForTask(taskUid);
  }

  async updateConfig() {
    await this.clearAllTasks();
    await this.updateEmbedders();
    await this.updateSettings(POST_SETTING);
  }

  async getDocuments(options: { limit?: number; offset?: number; fields?: string[] } = {}) {
    const { limit = 1, offset = 0, fields } = options;

    try {
      return await this.postIndex.getDocuments({ limit, offset, fields });
    } catch (error) {
      logger.error('getDocuments error:', error);
      return { results: [], total: 0 };
    }
  }
}

export class KnowledgeSearchClient extends SearchClient {
  async update(documents: Document[]) {
    await this.updatePosts(documents);
  }

  async remove(documentId: string) {
    const messages = await Segment.findAll({ where: { documentId } });
    const ids = messages.map((x) => getId(this.knowledgeId, x.content!));
    if (ids.length <= 0) return;

    await this.removePosts(ids);
  }
}
