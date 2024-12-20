import { Document } from '@langchain/core/documents';

import NormalRetriever from './normal';

export default class Retriever {
  constructor(
    private vectorPathOrKnowledgeId: string,
    private n: number = 10
  ) {}

  async search(query: string): Promise<Document[]> {
    return new NormalRetriever(this.vectorPathOrKnowledgeId, this.n).search(query);
  }
}
