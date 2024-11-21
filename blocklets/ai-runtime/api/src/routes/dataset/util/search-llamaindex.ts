import { Document } from '@langchain/core/documents';
import { OpenAI } from '@langchain/openai';
import { KeywordTableIndex, QueryFusionRetriever, VectorStoreIndex } from '@llamaindex/community';

import { AIKitEmbeddings } from '../../../core/embeddings/ai-kit';
import VectorStore from '../../../store/vector-store-faiss';

export class HybridRetriever {
  private llm: OpenAI;

  constructor() {
    this.llm = new OpenAI({ temperature: 0 });
  }

  async search(knowledgeId: string, query: string, topK: number = 5): Promise<Document[]> {
    const embeddings = new AIKitEmbeddings();
    const store = await VectorStore.load(knowledgeId, embeddings);
    const docs = await store.similaritySearch(' ', 10000);

    // 创建 LlamaIndex 的向量索引
    const vectorIndex = await VectorStoreIndex.fromDocuments(docs);

    // 创建关键词索引
    const keywordIndex = await KeywordTableIndex.fromDocuments(docs);

    // 创建 RAG Fusion 检索器
    const fusionRetriever = new QueryFusionRetriever({
      retrievers: [vectorIndex.asRetriever(), keywordIndex.asRetriever()],
      mode: RetrieverMode.RECIPROCAL_RANK, // 使用倒数排名融合
      llm: this.llm,
      queryGenNum: 3, // 生成3个查询变体
      similarityTopK: topK,
    });

    // 执行检索
    const results = await fusionRetriever.retrieve(query);

    // 转换回 LangChain Document 格式
    return results.map(
      (node: any) =>
        new Document({
          pageContent: node.text,
          metadata: node.metadata,
        })
    );
  }
}
