/* eslint-disable no-await-in-loop */
import { mkdir, rm, writeFile } from 'fs/promises';
import { basename, join } from 'path';

import logger from '@api/libs/logger';
import { copyRecursive } from '@blocklet/ai-runtime/utils/fs';
import { pathExists } from 'fs-extra';
import { Op } from 'sequelize';
import { joinURL } from 'ufo';

import { getProcessedFileDir, getSourceFileDir, getUploadDir, getVectorDir } from '../../libs/ensure-dir';
import { queue } from '../../routes/knowledge/util/queue';
import type { Migration } from '../migrate';
import Content from '../models/dataset/content';
import Knowledge from '../models/dataset/dataset';
import Document from '../models/dataset/document';

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
  const sourceDir = getSourceFileDir(knowledge.id);
  if (!(await pathExists(sourceDir))) {
    await mkdir(sourceDir, { recursive: true });
  }

  const processedDir = getProcessedFileDir(knowledge.id);
  if (!(await pathExists(processedDir))) {
    await mkdir(processedDir, { recursive: true });
  }

  const vectorDir = getVectorDir(knowledge.id);
  // 删除之前的向量数据库 从新 embedding
  await rm(vectorDir, { recursive: true, force: true });
  await mkdir(vectorDir, { recursive: true });

  // 复制老的数据
  const uploadDir = getUploadDir(knowledge.id);
  if ((await pathExists(uploadDir)) && (await pathExists(sourceDir))) {
    await copyRecursive(uploadDir, sourceDir);
  }

  const documents = await Document.findAll({ where: { knowledgeId: knowledge.id } });

  for (const document of documents) {
    try {
      if (document.type === 'file') {
        const filepath = (document.data as any)?.path;

        if (filepath) {
          const oldPath = join(getUploadDir(knowledge.id), basename(filepath));
          if (await pathExists(oldPath)) {
            await document.update({
              data: { type: 'file' },
              name: basename(filepath),
              filename: basename(filepath),
              embeddingStatus: 'idle',
            });

            queue.checkAndPush({ type: 'document', knowledgeId: knowledge.id, documentId: document.id });
          }
        }
      } else if (document.type === 'text') {
        const content = await Content.findOne({ where: { documentId: document.id } });
        queue.checkAndPush({ type: 'document', knowledgeId: knowledge.id, documentId: document.id });

        const originalFileName = `${document.id}.txt`;
        const originalFilePath = joinURL(getSourceFileDir(knowledge.id), originalFileName);
        await writeFile(originalFilePath, `${(document.data as any)?.content || content?.dataValues?.content || ''}`);

        await document.update({
          filename: originalFileName,
          embeddingStatus: 'idle',
          size: 0,
          data: { type: 'text' },
        });
        queue.checkAndPush({ type: 'document', knowledgeId: knowledge.id, documentId: document.id });
      } else if (document.type === 'discussKit') {
        await document.update({ embeddingStatus: 'idle' });
        queue.checkAndPush({ type: 'document', knowledgeId: knowledge.id, documentId: document.id });
        // @ts-ignore
      } else if (document.type === 'discussion' || document.type === 'fullSite') {
        await document.destroy();
      }
    } catch (error) {
      logger.error(`Failed to migrate document ${document.id}`, { error });
    }
  }
};
