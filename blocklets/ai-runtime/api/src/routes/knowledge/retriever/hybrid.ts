import { CohereRerank } from '@langchain/cohere';
import { Document } from '@langchain/core/documents';
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression';
import { LLMChainExtractor } from 'langchain/retrievers/document_compressors/chain_extract';
import { EnsembleRetriever } from 'langchain/retrievers/ensemble';
import { MultiQueryRetriever } from 'langchain/retrievers/multi_query';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

import logger from '../../../libs/logger';
import BaseRetriever from './base';

export default class HybridRetriever extends BaseRetriever {
  private vectorRetriever: any = null;

  private rerankThreshold: number = 0.3;

  async search(query: string): Promise<Document[]> {
    try {
      if (!this.vectorStore) {
        await this.initializeVectorStore();
      }

      if (!this.bm25Retriever) {
        await this.initializeBM25Retriever();
      }

      const vectorStore = this.vectorStore!;
      this.vectorRetriever = vectorStore.asRetriever(this.getTopK().k);

      if (vectorStore.getMapping() && !Object.keys(vectorStore.getMapping()).length) {
        logger.error('store get mapping is empty');
        return [];
      }

      // const queries = await this.queryTranslate(query); // version 1
      // logger.debug('queries', { queries });
      const documents = await this.getDocuments([query]);
      logger.debug('documents', { documents: documents.length });
      const extractorDocuments = await this.extractor(documents, query);
      logger.debug('extractorDocuments', { extractorDocuments: extractorDocuments.length });
      const rerankDocuments = await this.rerank(extractorDocuments, query);
      logger.debug('rerankDocuments', { rerankDocuments: rerankDocuments.length });
      const uniqueDocuments = this.uniqueDocuments(rerankDocuments);
      logger.debug('uniqueDocuments', { uniqueDocuments: uniqueDocuments.length });
      const filteredDocuments = uniqueDocuments.filter(
        (doc: any) => (doc?.metadata?.relevanceScore || 0) >= this.rerankThreshold
      );
      logger.debug('filteredDocuments', { filteredDocuments: filteredDocuments.length });

      return filteredDocuments;
    } catch (error) {
      logger.error('Search failed', { error });
      throw error;
    }
  }

  async queryTranslate(query: string): Promise<string[]> {
    const retriever = MultiQueryRetriever.fromLLM({ llm: this.llm, retriever: this.vectorRetriever });

    try {
      // @ts-ignore
      const queries = await retriever._generateQueries(query);
      return [query, ...(queries || [])];
    } catch (error) {
      return [query];
    }
  }

  async getDocuments(queries: string[]): Promise<Document[]> {
    const documents = await Promise.all(
      queries.map(async (query) => {
        const ensembleRetriever = new EnsembleRetriever({
          retrievers: [this.vectorRetriever, this.bm25Retriever!],
          weights: [0.7, 0.3],
        });
        const multiQueryRetriever = MultiQueryRetriever.fromLLM({
          retriever: this.vectorRetriever,
          llm: this.llm,
        });

        return [
          ...((await ensembleRetriever.invoke(query)) || []),
          ...((await multiQueryRetriever.invoke(query)) || []),
        ];
      })
    );

    return documents.flat();
  }

  async extractor(documents: Document[], query: string, isCompress: boolean = false): Promise<Document[]> {
    if (!documents.length) return [];

    if (!isCompress) return documents;

    const memoryVectorStore = await MemoryVectorStore.fromDocuments(documents, this.embeddings);
    const baseRetriever = memoryVectorStore.asRetriever({ k: documents.length });

    const baseCompressor = LLMChainExtractor.fromLLM(this.llm);
    const retriever = new ContextualCompressionRetriever({ baseCompressor, baseRetriever });
    const result = await retriever.invoke(query);

    // await memoryVectorStore.delete();

    return result;
  }

  async rerank(documents: Document[], query: string): Promise<Document[]> {
    if (!documents.length) return [];

    const cohereRerank = new CohereRerank({
      apiKey: process.env.COHERE_API_KEY,
      topN: documents.length,
      model: 'rerank-multilingual-v2.0',
    });

    const rerankedDocuments = await cohereRerank.compressDocuments(documents, query);
    return rerankedDocuments;
  }
}
