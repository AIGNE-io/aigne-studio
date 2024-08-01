import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { intersection } from 'lodash';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import Segment from '../../store/models/dataset/segment';
import UpdateHistories from '../../store/models/dataset/update-history';
import VectorStore from '../../store/vector-store-faiss';

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

export const updateHistoriesAndStore = async (datasetId: string, documentId: string, targetId?: string) => {
  const where = targetId ? { documentId, targetId } : { documentId };
  const { rows: messages, count } = await Segment.findAndCountAll({ where });

  if (count > 0) {
    const ids = messages.map((x) => x.id);
    // 仅仅做了save，没有其他地方使用,记录更新了哪些数据
    const found = await UpdateHistories.findOne({ where: { datasetId, documentId } });
    if (found) {
      await found.update({ segmentId: ids });
    } else {
      await UpdateHistories.create({ segmentId: ids, datasetId, documentId });
    }

    await deleteStore(datasetId, ids);

    await Segment.destroy({ where });
  }
};

export const saveContentToVectorStore = async ({
  metadata,
  content,
  datasetId,
  targetId = '',
  documentId,
}: {
  metadata?: any;
  content: string;
  datasetId: string;
  targetId: string;
  documentId: string;
}) => {
  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1024 });
  const embeddings = new AIKitEmbeddings({ batchSize: 4 });
  const docs = await textSplitter.createDocuments([content], metadata ? [{ metadata }] : undefined);

  const formatDocuments = docs.map((doc) => {
    if (metadata && typeof metadata === 'object' && Object.keys(metadata).length) {
      return { ...doc, pageContent: JSON.stringify({ content: doc.pageContent, ...metadata }) };
    }

    return doc;
  });

  const vectors = await embeddings.embedDocuments(formatDocuments.map((d) => d.pageContent));

  // 清除历史 Vectors Store
  await updateHistoriesAndStore(datasetId, documentId, targetId);

  // 获取索引数据，保存id
  const savePromises = formatDocuments.map((doc) =>
    doc.pageContent ? Segment.create({ documentId, targetId, content: doc.pageContent }) : Promise.resolve(null)
  );
  const results = await Promise.all(savePromises);
  const ids = results.filter(isNonNullable).map((result) => result?.id);

  // 保存到向量数据库
  const store = await VectorStore.load(datasetId, embeddings);
  await store.addVectors(vectors, formatDocuments, { ids });
  await store.save();
};
