import { BM25Retriever } from '@langchain/community/retrievers/bm25';
import { Document } from '@langchain/core/documents';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { OpenAI } from '@langchain/openai';
import { EnsembleRetriever } from 'langchain/retrievers/ensemble';
import { MultiQueryRetriever } from 'langchain/retrievers/multi_query';

import { AIKitEmbeddings } from '../../../core/embeddings/ai-kit';
import VectorStore from '../../../store/vector-store-faiss';

export class HybridRetriever {
  private llm: OpenAI;

  private embeddings: AIKitEmbeddings;

  constructor() {
    this.llm = new OpenAI({ temperature: 0 });
    this.embeddings = new AIKitEmbeddings({});
  }

  async search(knowledgeId: string, query: string, topK: number = 5): Promise<Document[]> {
    // 1. 加载向量存储
    const store = await VectorStore.load(knowledgeId, this.embeddings);

    // 2. 创建多查询检索器
    const multiQueryRetriever = MultiQueryRetriever.fromLLM({
      llm: this.llm as any,
      retriever: store.asRetriever(topK * 2) as any,
      queryCount: 3,
    });

    // 3. 创建 BM25 检索器
    const bm25Retriever = new BM25Retriever({ k: topK * 2, docs: store.documents as any });

    // 4. 创建集成检索器
    const ensembleRetriever = new EnsembleRetriever({
      retrievers: [multiQueryRetriever, bm25Retriever as any],
      weights: [0.7, 0.3], // 向量搜索权重更高
    });

    // 5. 执行检索
    let results = await ensembleRetriever.getRelevantDocuments(query);

    // 6. 重排序
    results = await this.rerank(results, query);

    return results.slice(0, topK);
  }

  private async rerank(docs: Document[], query: string): Promise<Document[]> {
    // 创建重排序提示
    const rerankPrompt = PromptTemplate.fromTemplate(`
      根据查询对文档进行相关性评分。
      查询: {query}
      文档: {document}
      
      仅返回0-10之间的分数，不要解释。
    `);

    const rerankChain = RunnableSequence.from([rerankPrompt, this.llm, (output) => parseFloat(output.text)]);

    // 为每个文档计算新的相关性分数
    const scoredDocs = await Promise.all(
      docs.map(async (doc) => {
        const score = await rerankChain.invoke({
          query,
          document: doc.pageContent,
        });
        return { doc, score };
      })
    );

    // 按分数排序
    return scoredDocs
      .sort((a, b) => b.score - a.score)
      .map(({ doc }) => {
        doc.metadata.reranked_score = doc.score;
        return doc;
      });
  }
}
