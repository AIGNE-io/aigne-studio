import { Document } from '@langchain/core/documents';
import orderBy from 'lodash/orderBy';

import logger from '../../../libs/logger';
import BaseRetriever from './base';

export default class NormalRetriever extends BaseRetriever {
  async search(query: string): Promise<Document[]> {
    try {
      if (!this.vectorStore) {
        await this.initializeVectorStore();
      }
      logger.debug('vectorStore initialized');

      const vectorStore = this.vectorStore!;

      if (vectorStore.getMapping() && !Object.keys(vectorStore.getMapping()).length) {
        logger.error('store get mapping is empty');
        return [];
      }

      const searchResults = await vectorStore.similaritySearch(query, this.getTopK().k);

      // 3. 融合并重排序结果
      const results = searchResults.map((doc) => ({ ...doc, _rankingScore: 0 }));
      const uniqueDocuments = this.uniqueDocuments(results);
      logger.debug('uniqueDocuments', { uniqueDocuments: uniqueDocuments.length });

      return orderBy(uniqueDocuments, ['_rankingScore'], ['desc']);
    } catch (error) {
      logger.error('Search failed', { error, query });
      throw error;
    }
  }
}
