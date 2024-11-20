import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { intersection } from 'lodash';

import { AIKitEmbeddings } from '../../../core/embeddings/ai-kit';
import Segment from '../../../store/models/dataset/segment';
import VectorStore from '../../../store/vector-store-faiss';

export const deleteStore = async (datasetId: string, ids: string[]) => {
  const embeddings = new AIKitEmbeddings({});
  const store = await VectorStore.load(datasetId, embeddings);

  const remoteIds = Object.values(store.getMapping()) || [];
  const deleteIds = intersection(remoteIds, ids);

  // 直接删除既可以，但这样更严谨
  if (deleteIds.length) {
    await store.delete({ ids: deleteIds });
    await store.save();
  }
};

export const updateHistoriesAndStore = async (knowledgeId: string, documentId: string, targetId?: string) => {
  const where = targetId ? { documentId, targetId } : { documentId };
  const { rows: messages, count } = await Segment.findAndCountAll({ where });

  if (count > 0) {
    const ids = messages.map((x) => x.id);
    await deleteStore(knowledgeId, ids);
    await Segment.destroy({ where });
  }
};

function formatDocument(doc: Document, metadata?: Record<string, unknown>) {
  if (metadata && Object.keys(metadata).length) {
    return {
      ...doc,
      pageContent: JSON.stringify({ content: doc.pageContent, ...metadata }),
    };
  }

  return doc;
}

async function processContent(
  content: string,
  metadata?: Record<string, unknown>,
  config?: { separators: string[]; chunkSize: number; chunkOverlap: number }
) {
  const splitter = new RecursiveCharacterTextSplitter(config);
  const embeddings = new AIKitEmbeddings();

  const chunks = await splitter.splitText(content);
  const docs = await splitter.createDocuments(chunks, metadata ? [{ metadata }] : undefined);

  const formattedDocs = docs.map((doc) => formatDocument(doc, metadata));
  const vectors = await embeddings.embedDocuments(formattedDocs.map((d) => d.pageContent));

  return { vectors, formattedDocs };
}

async function saveSegments(docs: Document[], documentId: string, targetId: string) {
  const segments = await Promise.all(
    docs.map((doc) => (doc.pageContent ? Segment.create({ documentId, targetId, content: doc.pageContent }) : null))
  );

  return segments.filter(isNonNullable).map((segment) => segment.id);
}

async function updateVectorStore(datasetId: string, vectors: number[][], docs: Document[], ids: string[]) {
  const embeddings = new AIKitEmbeddings();
  const store = await VectorStore.load(datasetId, embeddings);
  await store.addVectors(vectors, docs, { ids });
  await store.save();
}

export const saveContentToVectorStore = async ({
  metadata,
  content,
  datasetId,
  targetId = '',
  documentId,
}: {
  metadata?: Record<string, unknown>;
  content: string;
  datasetId: string;
  targetId: string;
  documentId: string;
}) => {
  // 文本分割配置提取
  const splitterConfig = {
    separators: ['\n\n', '\n'],
    chunkSize: 1024,
    chunkOverlap: 100,
  };

  // 文本处理和向量化
  const { vectors, formattedDocs } = await processContent(content, metadata, splitterConfig);

  // 清理历史数据
  await updateHistoriesAndStore(datasetId, documentId, targetId);

  // 保存分段并获取ID
  const segments = await saveSegments(formattedDocs, documentId, targetId);

  // 更新向量存储
  await updateVectorStore(datasetId, vectors, formattedDocs, segments);
};
