import config from '@blocklet/sdk/lib/config';
import { Document } from '@langchain/core/documents';

import HybridRetriever from './hybrid';
import NormalRetriever from './normal';

export default class Retriever {
  constructor(
    private vectorPathOrKnowledgeId: string,
    private n: number = 10
  ) {}

  async search(query: string): Promise<Document[]> {
    if (config.env.preferences.useHybridRetriever) {
      return new HybridRetriever(this.vectorPathOrKnowledgeId, this.n).search(query);
    }

    return new NormalRetriever(this.vectorPathOrKnowledgeId, this.n).search(query);
  }
}
