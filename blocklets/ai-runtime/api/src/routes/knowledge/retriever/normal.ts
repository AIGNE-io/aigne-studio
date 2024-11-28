import { Document } from '@langchain/core/documents';
import { EnsembleRetriever } from 'langchain/retrievers/ensemble';

import logger from '../../../libs/logger';
import BaseRetriever from './base';

export default class NormalRetriever extends BaseRetriever {
  private readonly RRF_K = 60;

  async search(query: string): Promise<Document[]> {
    try {
      if (!this.vectorStore) {
        await this.initializeVectorStore();
      }

      if (!this.bm25Retriever) {
        await this.initializeBM25Retriever();
      }

      const vectorStore = this.vectorStore!;
      if (vectorStore.getMapping() && !Object.keys(vectorStore.getMapping()).length) {
        logger.error('store get mapping is empty');
        return [];
      }

      logger.debug('Starting search process', { query });

      const ensembleRetriever = new EnsembleRetriever({
        retrievers: [this.bm25Retriever, vectorStore.asRetriever()],
        weights: [0.3, 0.7],
      } as any);

      const searchResults = await ensembleRetriever.invoke(query);

      // 3. 融合并重排序结果
      const results = this.rerank([searchResults]);

      return results;
    } catch (error) {
      logger.error('Search failed', { error, query });
      throw error;
    }
  }

  private rerank(resultSets: Document[][]): Document[] {
    const documentScores = new Map<string, { doc: Document; score: number; sources: Set<string> }>();

    // 计算每个文档的 RRF 分数
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
        // 结合原始相似度分数和RRF分数
        current.score += rrfScore * (doc.metadata.score || 1);
      });
    });

    // 额外的源一致性加权
    documentScores.forEach((value) => {
      if (value.sources.size > 1) {
        // 如果文档同时出现在多个源中，增加其分数
        value.score *= 1 + 0.1 * value.sources.size;
      }
    });

    // 排序并返回结果
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
    // 使用文档内容和可能的元数据创建唯一键
    return `${doc.pageContent}${doc.metadata.source || ''}`;
  }
}
