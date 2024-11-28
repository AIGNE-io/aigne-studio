import { HfInference } from '@huggingface/inference';
import { Document } from '@langchain/core/documents';
import { OpenAI } from '@langchain/openai';
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression';
import { LLMChainExtractor } from 'langchain/retrievers/document_compressors/chain_extract';
import { EnsembleRetriever } from 'langchain/retrievers/ensemble';
import { MultiQueryRetriever } from 'langchain/retrievers/multi_query';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

import logger from '../../../libs/logger';
import BaseRetriever from './base';

const HF_TOKEN = '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';

export default class HybridRetriever extends BaseRetriever {
  private vectorRetriever: any = null;

  private hf: HfInference = new HfInference(HF_TOKEN);

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

      const queries = await this.queryTranslate(query);
      logger.info('queries', { queries });
      const documents = await this.getDocuments(queries);
      logger.info('documents', { documents: documents.length });

      const extractorDocuments = await this.extractor(documents, query);
      logger.info('extractorDocuments', { extractorDocuments: extractorDocuments.length });
      const rerankDocuments = await this.rerank(extractorDocuments, query);
      logger.info('rerankDocuments', { rerankDocuments: rerankDocuments.length });
      const uniqueDocuments = this.uniqueDocuments(rerankDocuments);
      logger.info('uniqueDocuments', { uniqueDocuments: uniqueDocuments.length });

      return uniqueDocuments.slice(0, this.getTopK().k);
    } catch (error) {
      logger.error('Search failed', { error });
      throw error;
    }
  }

  async queryTranslate(query: string): Promise<string[]> {
    const retriever = MultiQueryRetriever.fromLLM({ llm: this.llm, retriever: this.vectorRetriever! });

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
      queries.map((query) => {
        const baseRetriever = new EnsembleRetriever({
          retrievers: [this.vectorRetriever, this.bm25Retriever!],
          weights: [0.7, 0.3],
        });

        return baseRetriever.invoke(query);
      })
    );

    return documents.flat();
  }

  async extractor(documents: Document[], query: string): Promise<Document[]> {
    const memoryVectorStore = await MemoryVectorStore.fromDocuments(documents, this.embeddings);
    const baseRetriever = memoryVectorStore.asRetriever({ k: documents.length });

    const baseCompressor = LLMChainExtractor.fromLLM(this.llm);
    const retriever = new ContextualCompressionRetriever({ baseCompressor, baseRetriever });
    const result = await retriever.invoke(query);
    console.log('query', query);
    console.log('result length', result.length);

    const model = new OpenAI({ model: 'gpt-3.5-turbo-instruct', apiKey: process.env.OPENAI_API_KEY });
    const baseCompressor1 = LLMChainExtractor.fromLLM(model as any);
    const retriever1 = new ContextualCompressionRetriever({ baseCompressor: baseCompressor1, baseRetriever });
    const result1 = await retriever1.invoke(query);
    console.log('result length', result1.length);

    return result1;
  }

  async rerank(documents: Document[], query: string): Promise<Document[]> {
    const scores = await Promise.all(
      documents.map((doc) =>
        this.hf.sentenceSimilarity({
          model: 'sentence-transformers/all-MiniLM-L6-v2',
          inputs: {
            source_sentence: query,
            sentences: [doc.pageContent],
          },
        })
      )
    );

    const result = documents.map((doc, i) => ({ doc, score: scores?.[i]?.[0] || 0 })).sort((a, b) => b.score - a.score);
    return result.map((item) => {
      item.doc.metadata.score = item.score;
      return item.doc;
    });
  }
}
