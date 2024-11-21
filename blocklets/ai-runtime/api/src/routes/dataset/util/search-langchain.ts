import { BM25Retriever } from '@langchain/community/retrievers/bm25';
import { Document } from '@langchain/core/documents';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';
import { MultiQueryRetriever } from 'langchain/retrievers/multi_query';

import { AIKitEmbeddings } from '../../../core/embeddings/ai-kit';
import logger from '../../../libs/logger';
import VectorStore from '../../../store/vector-store-faiss';

export class HybridRetriever {
  private readonly RRF_K = 60;

  private readonly BM25_WEIGHT = 0.3;

  private readonly VECTOR_WEIGHT = 0.7;

  private bm25Retriever: BM25Retriever | null = null;

  private vectorStore: VectorStore | null = null;

  constructor(private knowledgeId: string) {}

  async initialize(): Promise<void> {
    try {
      if (!this.vectorStore) throw new Error('VectorStore is required');

      logger.info('Initializing BM25Retriever...');
      const docs = await this.vectorStore.similaritySearch(' ', 10000);
      this.bm25Retriever = await BM25Retriever.fromDocuments(docs, { k: 10 });
      logger.info('BM25Retriever initialized successfully');
    } catch (error) {
      throw new Error('Failed to initialize BM25Retriever');
    }
  }

  async search(query: string): Promise<Document[]> {
    try {
      if (!this.vectorStore) {
        const embeddings = new AIKitEmbeddings();
        this.vectorStore = await VectorStore.load(this.knowledgeId, embeddings);
      }

      if (this.vectorStore.getMapping() && !Object.keys(this.vectorStore.getMapping()).length) {
        logger.error('store get mapping is empty');
        return [];
      }

      if (!this.bm25Retriever) {
        await this.initialize();
      }

      logger.info('Starting search process', { query });

      // 1. 生成查询变体
      const queries = await this.generateQueries(query);
      logger.info('Generated query variations', { queries });

      // 2. 执行混合检索
      const searchResults = await Promise.all(queries.map((q) => this.hybridSearch(q)));

      // 3. 融合并重排序结果
      const results = this.rerank(searchResults);

      logger.info('Search completed', { resultCount: results.length, originalQuery: query });

      return results;
    } catch (error) {
      logger.error('Search failed', { error, query });
      throw error;
    }
  }

  private async generateQueries(query: string): Promise<string[]> {
    const template = `Given the following question, please generate three different ways to ask the same question. 
    Maintain the original meaning but vary the wording and perspective.
    Original question: {question}
    
    Return only the three questions, one per line.`;

    try {
      const promptTemplate = PromptTemplate.fromTemplate(template);

      const chain = RunnableSequence.from([
        promptTemplate,
        new ChatOpenAI({ temperature: 0 }),
        new StringOutputParser(),
      ]);

      const response = await chain.invoke({
        question: query,
      });

      const generatedQueries = response
        .split('\n')
        .filter((q) => q.trim())
        .slice(0, 3);

      return [query, ...generatedQueries];
    } catch (error) {
      logger.error('Query generation failed', { error, query });
      return [query];
    }
  }

  async generateQueriesByMultiQueryRetriever(query: string): Promise<string[]> {
    if (!this.vectorStore) {
      throw new Error('VectorStore is required');
    }

    if (!this.bm25Retriever) {
      await this.initialize();
    }

    // 使用 MultiQueryRetriever 生成多个查询
    const retriever = MultiQueryRetriever.fromLLM({
      llm: new ChatOpenAI({ temperature: 0 }) as any,
      retriever: this.vectorStore.asRetriever() as any,
      verbose: true,
    });

    // 获取生成的查询
    const generatedQueries = await retriever.invoke(query);

    // 从结果中提取查询文本
    return [query, ...generatedQueries.map((doc) => doc.pageContent)];
  }

  private async hybridSearch(query: string): Promise<Document[]> {
    try {
      if (!this.bm25Retriever) {
        throw new Error('BM25Retriever not initialized');
      }

      if (!this.vectorStore) {
        throw new Error('VectorStore is required');
      }

      const [vectorResults, bm25Results] = await Promise.all([
        this.vectorStore.similaritySearch(query, 10),
        this.bm25Retriever.invoke(query),
      ]);

      // 合并结果并添加权重
      const scoredResults = [
        ...vectorResults.map((doc, index) => ({
          ...doc,
          metadata: {
            ...doc.metadata,
            score: (1 / (index + 1)) * this.VECTOR_WEIGHT,
            source: 'vector',
          },
        })),
        ...bm25Results.map((doc, index) => ({
          ...doc,
          metadata: {
            ...doc.metadata,
            score: (1 / (index + 1)) * this.BM25_WEIGHT,
            source: 'bm25',
          },
        })),
      ];

      return scoredResults;
    } catch (error) {
      logger.error('Hybrid search failed', { error, query });
      throw error;
    }
  }

  private rerank(resultSets: Document[][]): Document[] {
    try {
      const documentScores = new Map<
        string,
        {
          doc: Document;
          score: number;
          sources: Set<string>;
        }
      >();

      // 计算每个文档的RRF分数
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
    } catch (error) {
      logger.error('Reranking failed', { error });
      throw error;
    }
  }

  private getDocumentKey(doc: Document): string {
    // 使用文档内容和可能的元数据创建唯一键
    return `${doc.pageContent}${doc.metadata.source || ''}`;
  }
}
