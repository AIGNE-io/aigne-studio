/* eslint-disable no-await-in-loop */
import { mkdir, rm } from 'fs/promises';

import logger from '@api/libs/logger';
import { Op } from 'sequelize';

import { getVectorDir } from '../../libs/ensure-dir';
import { queue } from '../../routes/knowledge/util/queue';
import type { Migration } from '../migrate';
import Knowledge from '../models/dataset/dataset';
import Document from '../models/dataset/document';
import EmbeddingHistories from '../models/dataset/embedding-history';

export const up: Migration = async () => {
  try {
    const knowledge = await Knowledge.findAll();
    await Promise.all(knowledge.map(migrateKnowledge));

    // 删除没有用到文档
    await Document.destroy({ where: { knowledgeId: { [Op.notIn]: knowledge.map((k) => k.id) } } });

    await queue.queue.drained();

    logger.info('Migrate knowledge success');
  } catch (error) {
    logger.error('Failed to migrate knowledge', { error });
  }
};

export const down: Migration = async () => {};

const migrateKnowledge = async (knowledge: Knowledge) => {
  const vectorDir = getVectorDir(knowledge.id);
  await rm(vectorDir, { recursive: true, force: true });
  await mkdir(vectorDir, { recursive: true });

  await EmbeddingHistories.destroy({ where: { knowledgeId: knowledge.id } });
  const documents = await Document.findAll({ where: { knowledgeId: knowledge.id } });
  for (const document of documents) {
    await document.update({ error: null, embeddingStatus: 'idle' });
    queue.checkAndPush({ type: 'document', knowledgeId: knowledge.id, documentId: document.id });
  }
};
