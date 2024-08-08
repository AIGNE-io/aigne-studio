/* eslint-disable no-await-in-loop */
import { copyRecursive } from '@blocklet/ai-runtime/utils/fs';
import { exists, mkdir } from 'fs-extra';
import { Op } from 'sequelize';

import KnowledgeContents from '../store/models/dataset/content';
import Knowledge from '../store/models/dataset/dataset';
import KnowledgeDocuments from '../store/models/dataset/document';
import KnowledgeEmbeddingHistory from '../store/models/dataset/embedding-history';
import KnowledgeSegments from '../store/models/dataset/segment';
import { vectorStorePath } from '../store/vector-store-faiss';
import nextId from './next-id';

async function paginateAndInsert({
  findDB,
  insetDB,
  pageSize = 100,
  initialCursor = '',
}: {
  findDB: (data: {
    limit: number;
    order: [string, string][];
    where: Record<string, any>;
  }) => Promise<({ id: string } & { [key: string]: any })[]>;
  insetDB: (data: any[]) => Promise<any>;
  pageSize?: number;
  initialCursor?: string;
}) {
  let cursor = initialCursor;
  let hasMore = true;

  while (hasMore) {
    const queryOptions: {
      limit: number;
      order: [string, string][];
      where: Record<string, any>;
    } = {
      limit: pageSize,
      order: [['createdAt', 'ASC']],
      where: {},
    };

    if (cursor) {
      queryOptions.where.id = { [Op.lt]: cursor };
    }

    const list = await findDB(queryOptions);

    if (list.length > 0) {
      await insetDB(list.map((item) => item.dataValues));
      cursor = list[list.length - 1]?.id || '';
    } else {
      hasMore = false;
    }
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
  const knowledgeId = nextId();

  const knowledge = await Knowledge.findOne({
    where: { appId: oldProjectId, id: oldKnowledgeBaseId },
    rejectOnEmpty: new Error('Dataset not found'),
  });

  await importKnowledgeData(knowledgeId, newProjectId, knowledge.dataValues);

  return knowledgeId;
}

async function importKnowledgeData(
  newKnowledgeId: string,
  newProjectId: string,
  fromKnowledge: Knowledge['dataValues']
) {
  const oldKnowledgeId = fromKnowledge.id;

  // 新知识库的数据
  await Knowledge.create({ ...fromKnowledge, id: newKnowledgeId, appId: newProjectId });

  // 从旧知识库复制文档
  const documents = await KnowledgeDocuments.findAll({ where: { datasetId: oldKnowledgeId } });
  const map = Object.fromEntries(documents.map((doc) => [doc.id, nextId()]));
  const ids = documents.map((doc) => doc.id);

  if (documents.length) {
    await paginateAndInsert({
      findDB: (data) => {
        data.where.datasetId = oldKnowledgeId;
        return KnowledgeDocuments.findAll(data);
      },
      insetDB: (list) => {
        const format = list.map((dataValues) => ({
          ...dataValues,
          datasetId: newKnowledgeId,
          id: map[dataValues.id]! || nextId(),
        }));
        return KnowledgeDocuments.bulkCreate(format);
      },
    });
  }

  // 从旧知识库复制段落
  await paginateAndInsert({
    findDB: (data) => {
      data.where.documentId = { [Op.in]: ids };
      return KnowledgeSegments.findAll(data);
    },
    insetDB: (list) => {
      const format = list.map((dataValues) => ({
        ...dataValues,
        documentId: map[dataValues.documentId]! || nextId(),
        id: undefined,
      }));
      return KnowledgeSegments.bulkCreate(format);
    },
  });

  // 从旧知识库复制内容
  await paginateAndInsert({
    findDB: (data) => {
      data.where.documentId = { [Op.in]: ids };
      return KnowledgeContents.findAll(data);
    },
    insetDB: (list) => {
      const format = list.map((dataValues) => ({
        ...dataValues,
        documentId: map[dataValues.documentId]! || nextId(),
        id: undefined,
      }));
      return KnowledgeContents.bulkCreate(format);
    },
  });

  // 从旧知识库复制历史记录
  await paginateAndInsert({
    findDB: (data) => {
      data.where.datasetId = oldKnowledgeId;
      data.where.documentId = { [Op.in]: ids };
      return KnowledgeEmbeddingHistory.findAll(data);
    },
    insetDB: (list) => {
      const format = list.map((dataValues) => ({
        ...dataValues,
        datasetId: newKnowledgeId,
        documentId: map[dataValues.documentId]! || nextId(),
        id: undefined,
      }));
      return KnowledgeEmbeddingHistory.bulkCreate(format);
    },
  });

  // 复制向量数据库
  const newVectorStorePath = vectorStorePath(newKnowledgeId);
  const oldVectorStorePath = vectorStorePath(oldKnowledgeId);
  await mkdir(newVectorStorePath, { recursive: true });

  if ((await exists(oldVectorStorePath)) && (await exists(newVectorStorePath))) {
    copyRecursive(oldVectorStorePath, newVectorStorePath);
  }
}

export default copyKnowledgeBase;
