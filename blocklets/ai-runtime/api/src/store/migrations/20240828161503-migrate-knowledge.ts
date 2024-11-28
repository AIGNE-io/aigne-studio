import { copyFile, mkdir } from 'fs/promises';
import { basename, join } from 'path';

import logger from '@api/libs/logger';
import { copyRecursive } from '@blocklet/ai-runtime/utils/fs';
import { pathExists } from 'fs-extra';

import ensureKnowledgeDirExists, { getOldVectorStorePath, getUploadDir, getVectorDir } from '../../libs/ensure-dir';
import type { Migration } from '../migrate';
import Knowledge from '../models/dataset/dataset';
import Document from '../models/dataset/document';

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

  const oldVectorStorePath = getOldVectorStorePath(knowledge.id);
  const newVectorStorePath = getVectorDir(knowledge.id);

  if (await pathExists(oldVectorStorePath)) {
    await mkdir(newVectorStorePath, { recursive: true });
    await copyRecursive(oldVectorStorePath, newVectorStorePath);
  }

  // @ts-ignore
  const documents = await Document.findAll({ where: { datasetId: knowledge.id }, attributes: ['id', 'data'] });

  const migrateDocumentPromises = documents
    .filter((doc): doc is Document & { data: { path: string } } => {
      return !!(doc.data && typeof doc.data === 'object' && 'path' in doc.data && typeof doc.data.path === 'string');
    })
    .map(async (document) => {
      const { path } = document.data;
      if (!path || !(await pathExists(path))) return;

      const newPath = join(getUploadDir(knowledge.id), basename(path));
      await copyFile(path, newPath);
      // @ts-ignore
      await document.update({ data: { ...document.data, path: basename(path) } });
    });

  await Promise.all(migrateDocumentPromises);
};

async function migrateAllKnowledge() {
  const knowledge = await Knowledge.findAll();

  await Promise.all(knowledge.map(migrateKnowledge));
}
