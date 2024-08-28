import { copyFile, mkdir } from 'fs/promises';
import { basename, join } from 'path';

import { Config } from '@api/libs/env';
import logger from '@api/libs/logger';
import { copyRecursive } from '@blocklet/ai-runtime/utils/fs';
import { exists } from 'fs-extra';

import ensureKnowledgeDirExists, { getUploadDir, getVectorDir } from '../../libs/ensure-dir';
import type { Migration } from '../migrate';
import Knowledge from '../models/dataset/dataset';
import Document from '../models/dataset/document';
import { vectorStorePath } from '../vector-store-faiss';

export const up: Migration = async () => {
  try {
    await migrateAllKnowledge();
    logger.info('Migrate knowledge success');
  } catch (error) {
    logger.error('Failed to migrate knowledge', { error });
  }
};

export const down: Migration = async () => {};

const migrateKnowledge = async (knowledge: Knowledge) => {
  await ensureKnowledgeDirExists(knowledge.id);

  // 旧的知识库存在
  const oldVectorStorePath = vectorStorePath(knowledge.id);
  if (await exists(oldVectorStorePath)) {
    const newVectorStorePath = getVectorDir(knowledge.id);

    if (!(await exists(newVectorStorePath))) {
      await mkdir(newVectorStorePath, { recursive: true });
    }

    copyRecursive(oldVectorStorePath, newVectorStorePath);
  }

  // 旧的知识库文件
  const documents = await Document.findAll({ where: { datasetId: knowledge.id } });
  const hasPath = (data: any): data is { type: string; path: string } => {
    return typeof data === 'object' && 'path' in data;
  };
  const filterDocuments = documents.filter((i) => hasPath(i.data));

  for (const document of filterDocuments) {
    if (hasPath(document.data)) {
      if (!document.data.path) continue;
      if (!(await exists(document.data.path))) continue;

      // 文件不在之前的路径上
      if (!document.data.path.startsWith(Config.uploadDir)) continue;

      const newPath = join(getUploadDir(knowledge.id), basename(document.data.path));
      // 复制文件
      await copyFile(document.data.path, newPath);

      // 更新数据库文件位置
      await document.update({ data: { ...document.data, path: newPath } });
    }
  }
};

async function migrateAllKnowledge() {
  const knowledge = await Knowledge.findAll();

  await Promise.all(knowledge.map((knowledge) => migrateKnowledge(knowledge)));
}
