import { Document } from '@langchain/core/documents';
import { EnsembleRetriever } from 'langchain/retrievers/ensemble';

import logger from '../../../libs/logger';
import { getId } from '../util';
import BaseRetriever from './base';

export default class NormalRetriever extends BaseRetriever {
  private readonly RRF_K = 60;

  private vectorRetriever: any = null;

  async search(query: string): Promise<Document[]> {
    try {
      if (!this.vectorStore) {
        await this.initializeVectorStore();
      }
      logger.debug('vectorStore initialized');

      if (!this.bm25Retriever) {
        await this.initializeBM25Retriever();
      }
      logger.debug('bm25Retriever initialized');

      const vectorStore = this.vectorStore!;
      this.vectorRetriever = vectorStore.asRetriever(this.getTopK().k);

      if (vectorStore.getMapping() && !Object.keys(vectorStore.getMapping()).length) {
        logger.error('store get mapping is empty');
        return [];
      }
      logger.debug('Starting search process', { query });

      const ensembleRetriever = new EnsembleRetriever({
        retrievers: [this.bm25Retriever, this.vectorRetriever],
        weights: [0.3, 0.7],
      });
      logger.debug('ensembleRetriever initialized');

      const searchResults = await ensembleRetriever.invoke(query);
      logger.debug('searchResults', { searchResults });

      // 3. 融合并重排序结果
      const results = this.rerank([searchResults]);
      const uniqueDocuments = this.uniqueDocuments(results);
      logger.debug('uniqueDocuments', { uniqueDocuments: uniqueDocuments.length });

      return uniqueDocuments;
    } catch (error) {
      logger.error('Search failed', { error, query });
      throw error;
    }
  }

  private rerank(resultSets: Document[][]): Document[] {
    const documentScores = new Map<string, { doc: Document; score: number; sources: Set<string> }>();

    resultSets.forEach((results) => {
      results.forEach((doc, rank) => {
        const docKey = this.getDocumentKey(doc);
        const rrfScore = 1 / (this.RRF_K + rank + 1);

        if (!documentScores.has(docKey)) {
          documentScores.set(docKey, {
            doc,
            score: 0,
            sources: new Set([doc.metadata.source]),
          });
        } else {
          const current = documentScores.get(docKey)!;
          current.sources.add(doc.metadata.source);
        }

        const current = documentScores.get(docKey)!;
        current.score += rrfScore * (doc.metadata.score || 1);
      });
    });

    documentScores.forEach((value) => {
      if (value.sources.size > 1) {
        value.score *= 1 + 0.1 * value.sources.size;
      }
    });

    return Array.from(documentScores.values())
      .sort((a, b) => b.score - a.score)
      .map((item) => ({
        ...item.doc,
        metadata: {
          ...item.doc.metadata,
          finalScore: item.score,
          sources: Array.from(item.sources),
        },
      }));
  }

  private getDocumentKey(doc: Document): string {
    return getId(this.knowledgeId, `${doc.pageContent}`);
  }
}
