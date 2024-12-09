import { hash } from 'crypto';

import { BM25Retriever } from '@langchain/community/retrievers/bm25';
import { Document } from '@langchain/core/documents';
import { uniqBy } from 'lodash';

import { AIKitEmbeddings } from '../../../core/embeddings/ai-kit';
import { CustomLLM } from '../../../core/llm/custom';
import logger from '../../../libs/logger';
import VectorStore from '../../../store/vector-store-faiss';

export default class BaseRetriever {
  protected llm = new CustomLLM({ temperature: 0 }) as any;

  protected embeddings = new AIKitEmbeddings();

  protected vectorStore: VectorStore | null = null;

  protected bm25Retriever: BM25Retriever | null = null;

  protected getTopK(): { length: number; k: number } {
    if (!this.vectorStore) throw new Error('VectorStore is required');

    const { length } = Object.keys(this.vectorStore.getMapping());
    return { length, k: Math.min(this.n, length) };
  }

  protected async initializeBM25Retriever(): Promise<void> {
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

  protected async initializeVectorStore() {
    if (!this.vectorStore) {
      this.vectorStore = await VectorStore.load(this.vectorPathOrKnowledgeId, this.embeddings);
    }
  }

  constructor(
    private vectorPathOrKnowledgeId: string,
    private n: number = 4
  ) {}

  uniqueDocuments(documents: Document[]): Document[] {
    if (!documents.length) return [];

    const list = documents.map((doc) => {
      try {
        const parsedContent = JSON.parse(doc.pageContent);

        if (typeof parsedContent.content === 'string') {
          try {
            const content = JSON.parse(parsedContent.content);

            return { content: content.content, doc };
          } catch (e) {
            return { content: parsedContent.content, doc };
          }
        }

        return { content: parsedContent.content, doc };
      } catch {
        return { doc };
      }
    });

    return uniqBy(
      list.map(({ doc, content }) => ({ ...doc, hash: hash('md5', (content || '').trim(), 'hex') })),
      (doc) => doc.hash
    ).map(({ hash: _, ...doc }) => doc);
  }
}
