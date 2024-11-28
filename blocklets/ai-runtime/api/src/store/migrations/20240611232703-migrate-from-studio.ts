import { basename, join, resolve } from 'path';

import { Config } from '@api/libs/env';
import logger from '@api/libs/logger';
import { copy, exists, mkdir, readdir } from 'fs-extra';
import { Sequelize } from 'sequelize';

import type { Migration } from '../migrate';
import DatasetContent from '../models/dataset/content';
import Knowledge from '../models/dataset/dataset';
import DatasetDocument from '../models/dataset/document';
import DatasetEmbeddingHistory from '../models/dataset/embedding-history';
import DatasetSegment from '../models/dataset/segment';

export const up: Migration = async () => {
  try {
    await migrateFromAIStudio();
  } catch (error) {
    logger.error('Failed to migrate from AI Studio', { error });
  }
};

export const down: Migration = async () => {};

async function migrateFromAIStudio() {
  const aiStudioDataDir = resolve(Config.dataDir, '../ai-studio');

  const aiStudioDBPath = join(aiStudioDataDir, 'aistudio.db');
  if (!(await exists(aiStudioDBPath))) return;

  const url = `sqlite:${aiStudioDBPath}`;

  const aiStudioSequelize = new Sequelize(url, { logging: logger.info.bind(logger) });
  const aiStudioQueryInterface = aiStudioSequelize.getQueryInterface();

  const datasetDocuments = (
    (await aiStudioQueryInterface.select(DatasetDocument, 'DatasetDocuments')) as DatasetDocument[]
  ).map((i) => i.dataValues);
  await Promise.all(
    datasetDocuments.map(async (doc) => {
      if (doc.data) {
        try {
          if ('path' in doc.data && typeof doc.data.path === 'string') {
            const { path } = doc.data;
            if (await exists(path)) {
              const newPath = join(Config.dataDir, 'uploads', basename(path));
              await copy(path, newPath);
              doc.data.path = newPath;
            }
          }
        } catch (error) {
          logger.error('Failed to copy dataset document file', { error });
          // ignore
        }
      }
    })
  );
  const datasetDocumentCount = (await DatasetDocument.bulkCreate(datasetDocuments)).length;
  logger.info('Migrated dataset documents', { datasetDocumentCount });

  const datasets = ((await aiStudioQueryInterface.select(Knowledge, 'Datasets')) as Knowledge[]).map(
    (i) => i.dataValues
  );
  const datasetCount = (await Knowledge.bulkCreate(datasets)).length;
  logger.info('Migrated datasets', { datasetCount });

  const datasetContents = (
    (await aiStudioQueryInterface.select(DatasetContent, 'DatasetContents')) as DatasetContent[]
  ).map((i) => i.dataValues);
  const datasetContentCount = (await DatasetContent.bulkCreate(datasetContents)).length;
  logger.info('Migrated dataset contents', { datasetContentCount });

  const datasetEmbeddingHistories = (
    (await aiStudioQueryInterface.select(
      DatasetEmbeddingHistory,
      'DatasetEmbeddingHistories'
    )) as DatasetEmbeddingHistory[]
  ).map((i) => i.dataValues);
  const datasetEmbeddingHistoryCount = (await DatasetEmbeddingHistory.bulkCreate(datasetEmbeddingHistories)).length;
  logger.info('Migrated dataset embedding histories', { datasetEmbeddingHistoryCount });

  const datasetSegments = (
    (await aiStudioQueryInterface.select(DatasetSegment, 'DatasetSegments')) as DatasetSegment[]
  ).map((i) => i.dataValues);
  const datasetSegmentCount = (await DatasetSegment.bulkCreate(datasetSegments)).length;
  logger.info('Migrated dataset segments', { datasetSegmentCount });

  const aiStudioVectorsDir = join(aiStudioDataDir, 'vectors');
  if (await exists(aiStudioVectorsDir)) {
    const vectorsDir = resolve(Config.dataDir, 'vectors');
    await mkdir(vectorsDir, { recursive: true });
    const list = await readdir(aiStudioVectorsDir);
    for (const item of list) {
      await copy(join(aiStudioVectorsDir, item), join(vectorsDir, item));
    }
    logger.info('copied vectors from ai-studio to ai-runtime successfully');
  }
}
