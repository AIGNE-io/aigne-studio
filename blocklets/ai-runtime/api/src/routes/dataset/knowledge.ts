import { copyRecursive } from '@blocklet/ai-runtime/utils/fs';
import { exists, mkdir } from 'fs-extra';
import { Op } from 'sequelize';

import KnowledgeContents from '../../store/models/dataset/content';
import Knowledge, { nextId } from '../../store/models/dataset/dataset';
import KnowledgeDocuments from '../../store/models/dataset/document';
import KnowledgeEmbeddingHistory from '../../store/models/dataset/embedding-history';
import KnowledgeSegments from '../../store/models/dataset/segment';
import { vectorStorePath } from '../../store/vector-store-faiss';

async function createNewKnowledgeBase({
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

  const map: { [key: string]: string } = {};
  // 从旧知识库复制文档
  const documents = await KnowledgeDocuments.findAll({ where: { datasetId: oldKnowledgeBaseId } });
  const newDocuments = documents.map((document) => {
    const newDocument = document.dataValues;
    newDocument.datasetId = newKnowledgeBaseId;

    map[document.id] = nextId();
    newDocument.id = map[document.id]!;
    return newDocument;
  });
  await KnowledgeDocuments.bulkCreate(newDocuments);

  const ids = documents.map((doc) => doc.id);
  // 从旧知识库复制内容

  const contents = await KnowledgeContents.findAll({
    where: { documentId: { [Op.in]: ids } },
  });
  const newContents = contents.map((content) => {
    const newContent = content.dataValues;
    newContent.documentId = map[content.documentId]! || nextId();
    return newContent;
  });
  await KnowledgeContents.bulkCreate(newContents);

  // 从旧知识库复制段落
  const segments = await KnowledgeSegments.findAll({ where: { documentId: { [Op.in]: ids } } });
  const newSegments = segments.map((segment) => {
    const newSegment = segment.dataValues;
    newSegment.documentId = map[segment.documentId]! || nextId();
    return newSegment;
  });
  await KnowledgeSegments.bulkCreate(newSegments);

  // 从旧知识库复制历史记录
  const histories = await KnowledgeEmbeddingHistory.findAll({
    where: { datasetId: oldKnowledgeBaseId, documentId: { [Op.in]: ids } },
  });
  const newHistories = histories.map((history) => {
    const newHistory = history.dataValues;
    newHistory.datasetId = newKnowledgeBaseId;
    newHistory.documentId = map[history.documentId]! || nextId();
    return newHistory;
  });
  await KnowledgeEmbeddingHistory.bulkCreate(newHistories);

  // 复制向量数据库
  const newVectorStorePath = vectorStorePath(newKnowledgeBaseId);
  const oldVectorStorePath = vectorStorePath(oldKnowledgeBaseId);
  await mkdir(newVectorStorePath, { recursive: true });

  if ((await exists(oldVectorStorePath)) && (await exists(newVectorStorePath))) {
    copyRecursive(oldVectorStorePath, newVectorStorePath);
  }
}

export default createNewKnowledgeBase;
