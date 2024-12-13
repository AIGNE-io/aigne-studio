import { Document } from '@langchain/core/documents';

import logger from '../../../../libs/logger';
import BaseRetriever from '../base';
import SearchClient from './meilisearch';

export default class MeiliSearchRetriever extends BaseRetriever {
  async search(query: string): Promise<Document[]> {
    try {
      const client = new SearchClient(this.knowledgeId);
      if (!client.canUse) {
        logger.error('search kit not working');
        return [];
      }

      const fields = ['pageContent'];
      const commonParams = {
        ...(!!(await client.getEmbedders()) && { hybrid: { embedder: 'default', semanticRatio: 0.1 } }),
      };
      const modeParams = {
        attributesToCrop: fields,
        cropLength: 40,
      };

      const result = (
        await client.search(query, {
          attributesToRetrieve: ['*'],
          attributesToHighlight: fields,
          highlightPreTag: '<mark>',
          highlightPostTag: '</mark>',
          showRankingScore: true,
          showRankingScoreDetails: true,
          rankingScoreThreshold: 0.4,
          ...modeParams,
          ...commonParams,
        })
      ).hits;

      return result;
    } catch (error) {
      logger.error('Search failed', { error, query });
      throw error;
    }
  }
}
