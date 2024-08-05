/* eslint-disable no-await-in-loop */
import { copyRecursive } from '@blocklet/ai-runtime/utils/fs';
import { exists, mkdir } from 'fs-extra';
import { InferCreationAttributes, Model, Op } from 'sequelize';

import KnowledgeContents from '../store/models/dataset/content';
import Knowledge from '../store/models/dataset/dataset';
import KnowledgeDocuments from '../store/models/dataset/document';
import KnowledgeEmbeddingHistory from '../store/models/dataset/embedding-history';
import KnowledgeSegments from '../store/models/dataset/segment';
import { vectorStorePath } from '../store/vector-store-faiss';
import nextId from './get-id';

async function paginateAndInsert<M extends Model>(
  model: { new (): M } & typeof Model,
  whereCondition: Record<string, any>,
  modifyDataCallback: (data: InferCreationAttributes<M>, item: M) => InferCreationAttributes<M>,
  batchSize: number = 100
): Promise<void> {
  const totalItems = await model.count({ where: whereCondition });

  for (let offset = 0; offset < totalItems; offset += batchSize) {
    const items = await model.findAll({ where: whereCondition, offset, limit: batchSize });
    const newItems = items.map((item: any) => modifyDataCallback(item.dataValues, item));
    await model.bulkCreate(newItems);
  }
}

async function copyKnowledgeBase({
  oldKnowledgeBaseId,
  oldProjectId,
  newProjectId,
}: {
  oldKnowledgeBaseId: string;
  oldProjectId: string;
  newProjectId: string;
}): Promise<string> {
  const newKnowledgeBaseId = nextId();

  const dataset = await Knowledge.findOne({ where: { appId: oldProjectId, id: oldKnowledgeBaseId } });
  if (!dataset) {
    throw new Error('Dataset not found');
  }

  await importKnowledgeBaseData(newKnowledgeBaseId, newProjectId, dataset.dataValues);

  return newKnowledgeBaseId;
}

async function importKnowledgeBaseData(newKnowledgeBaseId: string, projectId: string, data: any) {
  const oldKnowledgeBaseId = data.id;

  // 新知识库的数据
  const newKnowledgeBase = { ...data, id: newKnowledgeBaseId, appId: projectId };
  await Knowledge.create(newKnowledgeBase);

  // 从旧知识库复制文档
  const documents = await KnowledgeDocuments.findAll({ where: { datasetId: oldKnowledgeBaseId } });
  const map = Object.fromEntries(documents.map((doc) => [doc.id, nextId()]));
  const ids = documents.map((doc) => doc.id);

  if (documents.length) {
    await paginateAndInsert(
      // @ts-ignore
      KnowledgeDocuments,
      { datasetId: oldKnowledgeBaseId },
      (dataValues, data) => {
        return { ...dataValues, datasetId: newKnowledgeBaseId, id: map[data.id]! || nextId() };
      }
    );
  }

  // 从旧知识库复制段落
  // @ts-ignore
  await paginateAndInsert(
    // @ts-ignore
    KnowledgeSegments,
    { documentId: { [Op.in]: ids } },
    (dataValues, data) => {
      return { ...dataValues, documentId: map[data.documentId]! || nextId(), id: undefined };
    }
  );

  // 从旧知识库复制内容
  await paginateAndInsert(
    // @ts-ignore
    KnowledgeContents,
    { documentId: { [Op.in]: ids } },
    (dataValues, data) => {
      return {
        ...dataValues,
        documentId: map[data.documentId]! || nextId(),
        id: undefined,
      };
    }
  );

  // 从旧知识库复制历史记录
  await paginateAndInsert(
    // @ts-ignore
    KnowledgeEmbeddingHistory,
    { datasetId: oldKnowledgeBaseId, documentId: { [Op.in]: ids } },
    (dataValues, data) => {
      return {
        ...dataValues,
        datasetId: newKnowledgeBaseId,
        documentId: map[data.documentId]! || nextId(),
        id: undefined,
      };
    }
  );

  // 复制向量数据库
  const newVectorStorePath = vectorStorePath(newKnowledgeBaseId);
  const oldVectorStorePath = vectorStorePath(oldKnowledgeBaseId);
  await mkdir(newVectorStorePath, { recursive: true });

  if ((await exists(oldVectorStorePath)) && (await exists(newVectorStorePath))) {
    copyRecursive(oldVectorStorePath, newVectorStorePath);
  }
}

export default copyKnowledgeBase;
