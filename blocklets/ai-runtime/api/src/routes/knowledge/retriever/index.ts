import config from '@blocklet/sdk/lib/config';
import { Document } from '@langchain/core/documents';

import HybridRetriever from './hybrid';
import MeiliSearchRetriever from './meilisearch';
import NormalRetriever from './normal';

export default class Retriever {
  constructor(
    private knowledgeId: string,
    private vectorPathOrKnowledgeId: string,
    private n: number = 10
  ) {}

  async search(query: string): Promise<Document[]> {
    const retrieverMAP: Record<string, any> = {
      hybrid: HybridRetriever,
      normal: NormalRetriever,
      meilisearch: MeiliSearchRetriever,
    };

    const Retriever = retrieverMAP[config.env.preferences.retriever];
    if (Retriever) {
      return new Retriever(this.knowledgeId, this.vectorPathOrKnowledgeId, this.n).search(query);
    }

    return new MeiliSearchRetriever(this.knowledgeId, this.vectorPathOrKnowledgeId, this.n).search(query);
  }
}
