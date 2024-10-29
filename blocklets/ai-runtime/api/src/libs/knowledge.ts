/* eslint-disable no-await-in-loop */
import { copyRecursive } from '@blocklet/ai-runtime/utils/fs';
import { mkdir, pathExists } from 'fs-extra';
import { CreationAttributes, Model, Op } from 'sequelize';

import KnowledgeContents from '../store/models/dataset/content';
import Knowledge from '../store/models/dataset/dataset';
import KnowledgeDocuments from '../store/models/dataset/document';
import KnowledgeEmbeddingHistory from '../store/models/dataset/embedding-history';
import KnowledgeSegments from '../store/models/dataset/segment';
import { getKnowledgeDir } from './ensure-dir';
import nextId from './next-id';

async function paginateAndInsert<M extends Model>({
  findAll,
  bulkCreate,
  pageSize = 100,
  initialCursor = '',
}: {
  findAll: (options: { limit: number; order: [string, string][]; where: Record<string, any> }) => Promise<M[]>;
  bulkCreate: (records: CreationAttributes<M>[]) => Promise<any>;
  pageSize?: number;
  initialCursor?: string;
}) {
  let cursor = initialCursor;

  while (true) {
    const queryOptions: { limit: number; order: [string, string][]; where: Record<string, any> } = {
      limit: pageSize,
      order: [['id', 'ASC']],
      where: {},
    };

    if (cursor) {
      queryOptions.where.id = { [Op.gt]: cursor };
    }

    const list = await findAll(queryOptions);

    if (list.length > 0) {
      await bulkCreate(list.map((item) => item.dataValues));
      cursor = list[list.length - 1]?.dataValues?.id || '';
    } else {
      break;
    }
  }
}

async function copyKnowledgeBase({
  oldKnowledgeBaseId,
  oldProjectId,
  newProjectId,
  userId,
}: {
  oldKnowledgeBaseId: string;
  oldProjectId: string;
  newProjectId: string;
  userId: string;
}): Promise<string> {
  const knowledgeId = nextId();

  const knowledge = await Knowledge.findOne({
    where: { appId: oldProjectId, id: oldKnowledgeBaseId },
    rejectOnEmpty: new Error('Dataset not found'),
  });

  await importKnowledgeData(knowledgeId, newProjectId, knowledge.dataValues, userId);

  return knowledgeId;
}

async function importKnowledgeData(
  newKnowledgeId: string,
  newProjectId: string,
  fromKnowledge: Knowledge['dataValues'],
  userId: string
) {
  const oldKnowledgeId = fromKnowledge.id;

  // 新知识库的数据
  await Knowledge.create({
    ...fromKnowledge,
    id: newKnowledgeId,
    appId: newProjectId,
    createdBy: userId,
    updatedBy: userId,
  });

  // 从旧知识库复制文档
  const map: { [oldDocumentId: string]: string } = {};

  await paginateAndInsert({
    findAll: (data) => {
      data.where.datasetId = oldKnowledgeId;
      return KnowledgeDocuments.findAll(data);
    },
    bulkCreate: (list) => {
      const format = list.map((dataValues) => {
        map[dataValues.id!] = nextId();

        return {
          ...dataValues,
          datasetId: newKnowledgeId,
          id: map[dataValues.id!] || nextId(),
          createdBy: userId,
          updatedBy: userId,
        };
      });
      return KnowledgeDocuments.bulkCreate(format);
    },
  });

  const ids = Object.keys(map);

  // 从旧知识库复制段落
  await paginateAndInsert({
    findAll: (data) => {
      data.where.documentId = { [Op.in]: ids };
      return KnowledgeSegments.findAll(data);
    },
    bulkCreate: (list) => {
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
    findAll: (data) => {
      data.where.documentId = { [Op.in]: ids };
      return KnowledgeContents.findAll(data);
    },
    bulkCreate: (list) => {
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
    findAll: (data) => {
      data.where.datasetId = oldKnowledgeId;
      data.where.documentId = { [Op.in]: ids };
      return KnowledgeEmbeddingHistory.findAll(data);
    },
    bulkCreate: (list) => {
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
  const newVectorStorePath = getKnowledgeDir(newKnowledgeId);
  const oldVectorStorePath = getKnowledgeDir(oldKnowledgeId);
  await mkdir(newVectorStorePath, { recursive: true });

  if ((await pathExists(oldVectorStorePath)) && (await pathExists(newVectorStorePath))) {
    copyRecursive(oldVectorStorePath, newVectorStorePath);
  }
}

export default copyKnowledgeBase;
