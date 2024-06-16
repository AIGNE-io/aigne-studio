import { basename, join, resolve } from 'path';

import { Config } from '@api/libs/env';
import logger from '@api/libs/logger';
import { copy, exists, mkdir, readdir } from 'fs-extra';
import { QueryInterface, Sequelize } from 'sequelize';

import type { Migration } from '../migrate';
import DatasetContent from '../models/dataset/content';
import Dataset from '../models/dataset/dataset';
import DatasetDocument from '../models/dataset/document';
import DatasetEmbeddingHistory from '../models/dataset/embedding-history';
import DatasetSegment from '../models/dataset/segment';
import DatasetUpdateHistory from '../models/dataset/update-history';

export const up: Migration = async ({ context: queryInterface }) => {
  try {
    await migrateFromAIStudio({ queryInterface });
  } catch (error) {
    logger.error('Failed to migrate from AI Studio', { error });
  }
};

export const down: Migration = async () => {};

async function migrateFromAIStudio({ queryInterface }: { queryInterface: QueryInterface }) {
  const aiStudioDataDir = resolve(Config.dataDir, '../ai-studio');

  const aiStudioDBPath = join(aiStudioDataDir, 'aistudio.db');
  if (!(await exists(aiStudioDBPath))) return;

  const url = `sqlite:${aiStudioDBPath}`;

  const aiStudioSequelize = new Sequelize(url, { logging: logger.info.bind(logger) });
  const aiStudioQueryInterface = aiStudioSequelize.getQueryInterface();

  const datasetDocuments = await aiStudioQueryInterface.select(DatasetDocument, 'DatasetDocuments', { raw: true });
  await Promise.all(
    datasetDocuments.map(async (doc: any) => {
      if (doc.data) {
        try {
          const data = JSON.parse(doc.data);
          if ('path' in data && typeof data.path === 'string') {
            const { path } = data;
            if (await exists(path)) {
              const newPath = join(Config.dataDir, 'uploads', basename(path));
              await copy(path, newPath);
              data.path = newPath;
              doc.data = JSON.stringify(data);
            }
          }
        } catch (error) {
          logger.error('Failed to copy dataset document file', { error });
          // ignore
        }
      }
    })
  );
  const datasetDocumentCount = await queryInterface.bulkInsert('DatasetDocuments', datasetDocuments);
  logger.info('Migrated dataset documents', { datasetDocumentCount });

  const datasets = await aiStudioQueryInterface.select(Dataset, 'Datasets', { raw: true });
  const datasetCount = await queryInterface.bulkInsert('Datasets', datasets);
  logger.info('Migrated datasets', { datasetCount });

  const datasetContents = await aiStudioQueryInterface.select(DatasetContent, 'DatasetContents', { raw: true });
  const datasetContentCount = await queryInterface.bulkInsert('DatasetContents', datasetContents);
  logger.info('Migrated dataset contents', { datasetContentCount });

  const datasetEmbeddingHistories = await aiStudioQueryInterface.select(
    DatasetEmbeddingHistory,
    'DatasetEmbeddingHistories',
    { raw: true }
  );
  const datasetEmbeddingHistoryCount = await queryInterface.bulkInsert(
    'DatasetEmbeddingHistories',
    datasetEmbeddingHistories
  );
  logger.info('Migrated dataset embedding histories', { datasetEmbeddingHistoryCount });

  const datasetSegments = await aiStudioQueryInterface.select(DatasetSegment, 'DatasetSegments', { raw: true });
  const datasetSegmentCount = await queryInterface.bulkInsert('DatasetSegments', datasetSegments);
  logger.info('Migrated dataset segments', { datasetSegmentCount });

  const datasetUpdateHistories = await aiStudioQueryInterface.select(DatasetUpdateHistory, 'DatasetUpdateHistories', {
    raw: true,
  });
  const datasetUpdateHistoryCount = await queryInterface.bulkInsert('DatasetUpdateHistories', datasetUpdateHistories);
  logger.info('Migrated dataset update histories', { datasetUpdateHistoryCount });

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
