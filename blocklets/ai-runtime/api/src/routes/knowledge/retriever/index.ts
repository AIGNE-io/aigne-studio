import { BM25Retriever } from '@langchain/community/retrievers/bm25';
import { Document } from '@langchain/core/documents';
import { EnsembleRetriever } from 'langchain/retrievers/ensemble';

import { AIKitEmbeddings } from '../../../core/embeddings/ai-kit';
import logger from '../../../libs/logger';
import VectorStore from '../../../store/vector-store-faiss';

export class HybridRetriever {
  private readonly RRF_K = 60;

  private readonly BM25_WEIGHT = 0.3;

  private readonly VECTOR_WEIGHT = 0.7;

  private bm25Retriever: BM25Retriever | null = null;

  private vectorStore: VectorStore | null = null;

  constructor(
    private vectorPathOrKnowledgeId: string,
    private n: number = 10
  ) {}

  private getTopK(): { length: number; k: number } {
    if (!this.vectorStore) throw new Error('VectorStore is required');

    const { length } = Object.keys(this.vectorStore.getMapping());
    return { length, k: Math.min(this.n, length) };
  }

  async initialize(): Promise<void> {
    try {
      if (!this.vectorStore) throw new Error('VectorStore is required');

      logger.debug('Initializing BM25Retriever...');
      const { k, length } = this.getTopK();
      const docs = await this.vectorStore.similaritySearch(' ', length);
      this.bm25Retriever = await BM25Retriever.fromDocuments(docs, { k });
      logger.debug('BM25Retriever initialized successfully');
    } catch (error) {
      throw new Error('Failed to initialize BM25Retriever');
    }
  }

  async search(query: string): Promise<Document[]> {
    try {
      logger.debug('Starting search process', { query });

      if (!this.vectorStore) {
        const embeddings = new AIKitEmbeddings();
        this.vectorStore = await VectorStore.load(this.vectorPathOrKnowledgeId, embeddings);
      }

      logger.debug('vectorStore initialized');

      if (this.vectorStore.getMapping() && !Object.keys(this.vectorStore.getMapping()).length) {
        logger.error('store get mapping is empty');
        return [];
      }

      logger.debug('store get mapping is not empty');

      if (!this.bm25Retriever) {
        await this.initialize();
      }

      logger.debug('bm25Retriever initialized');

      logger.debug('Starting search process', { query });
      const ensembleRetriever = new EnsembleRetriever({
        retrievers: [this.bm25Retriever, this.vectorStore.asRetriever()],
        weights: [0.3, 0.7],
      } as any);
      logger.debug('ensembleRetriever', { ensembleRetriever });

      const searchResults = await ensembleRetriever.invoke(query);
      logger.debug('searchResults', { searchResults });

      // 3. 融合并重排序结果
      const results = this.rerank([searchResults]);
      logger.debug('results', { results });

      return results;
    } catch (error) {
      logger.error('Search failed', { error, query });
      throw error;
    }
  }

  async hybridSearch(query: string): Promise<Document[]> {
    try {
      if (!this.bm25Retriever) {
        throw new Error('BM25Retriever not initialized');
      }

      if (!this.vectorStore) {
        throw new Error('VectorStore is required');
      }

      const { k } = this.getTopK();

      const [vectorResults, bm25Results] = await Promise.all([
        this.vectorStore.similaritySearch(query, k),
        this.bm25Retriever.invoke(query),
      ]);

      const scoredResults = [
        ...vectorResults.map((doc, index) => ({
          ...doc,
          metadata: { ...doc.metadata, score: (1 / (index + 1)) * this.VECTOR_WEIGHT, source: 'vector' },
        })),
        ...bm25Results.map((doc, index) => ({
          ...doc,
          metadata: { ...doc.metadata, score: (1 / (index + 1)) * this.BM25_WEIGHT, source: 'bm25' },
        })),
      ];

      return scoredResults;
    } catch (error) {
      logger.error('Hybrid search failed', { error, query });
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

export class Retriever {
  async search(): Promise<Document[]> {
    try {
      await this.queryTranslate('');
      await this.routing();
      await this.queryConstruction();
      await this.indexing();
      await this.retrieval();
      await this.generation();
      return [];
    } catch (error) {
      logger.error('Search failed', { error });
      throw error;
    }
  }

  async queryTranslate(query: string): Promise<string> {
    return query;
  }

  async routing() {
    return '';
  }

  async queryConstruction() {
    return '';
  }

  async indexing() {
    return '';
  }

  async retrieval() {
    return [];
  }

  async generation() {
    return '';
  }
}
