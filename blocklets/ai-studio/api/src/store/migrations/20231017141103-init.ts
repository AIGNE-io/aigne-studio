import type { Migration } from '../migrate';
import models from '../models';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('Projects', models.Projects.GENESIS_ATTRIBUTES);
  await queryInterface.createTable('EmbeddingHistories', models.EmbeddingHistories.GENESIS_ATTRIBUTES);
  await queryInterface.createTable('Datasets', models.Datasets.GENESIS_ATTRIBUTES);
  await queryInterface.createTable('DatasetItems', models.DatasetItems.GENESIS_ATTRIBUTES);
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('Projects');
  await queryInterface.dropTable('EmbeddingHistories');
  await queryInterface.dropTable('Datasets');
  await queryInterface.dropTable('DatasetItems');
};
