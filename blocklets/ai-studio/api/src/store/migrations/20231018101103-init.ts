import Sequelize from 'sequelize';

import { datasetItems } from '../dataset-items';
import { datasets } from '../datasets';
import { embeddingHistories } from '../embedding-history';
import type { Migration } from '../migrate';
import models from '../models';
import { projects } from '../projects';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('Projects', models.Projects.GENESIS_ATTRIBUTES);
  await queryInterface.createTable('EmbeddingHistories', models.EmbeddingHistories.GENESIS_ATTRIBUTES);
  await queryInterface.createTable('Datasets', models.Datasets.GENESIS_ATTRIBUTES);
  await queryInterface.createTable('DatasetItems', models.DatasetItems.GENESIS_ATTRIBUTES);

  const projectRows = await projects.cursor().sort({ updatedAt: -1 }).exec();
  if (projectRows.length) {
    await queryInterface.bulkInsert('Projects', projectRows);
  }

  const datasetRows = await datasets.cursor().sort({ updatedAt: -1 }).exec();
  if (datasetRows.length) {
    await queryInterface.bulkInsert('Datasets', datasetRows);
  }

  const datasetItemRows = await datasetItems.cursor().sort({ updatedAt: -1 }).exec();
  if (datasetItemRows.length) {
    await queryInterface.bulkInsert('DatasetItems', datasetItemRows, {}, { data: { type: new Sequelize.JSON() } });
  }

  const embeddingHistoriesRows = await embeddingHistories.cursor().sort({ updatedAt: -1 }).exec();
  if (embeddingHistoriesRows.length) {
    await queryInterface.bulkInsert('EmbeddingHistories', embeddingHistoriesRows);
  }
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('Projects');
  await queryInterface.dropTable('EmbeddingHistories');
  await queryInterface.dropTable('Datasets');
  await queryInterface.dropTable('DatasetItems');

  await queryInterface.bulkDelete('Projects', {});
  await queryInterface.bulkDelete('Datasets', {});
  await queryInterface.bulkDelete('DatasetItems', {});
  await queryInterface.bulkDelete('EmbeddingHistories', {});
};
