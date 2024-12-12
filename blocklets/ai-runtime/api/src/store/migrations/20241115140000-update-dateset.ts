import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameColumn('Datasets', 'appId', 'projectId');
  await queryInterface.addColumn('Datasets', 'resourceBlockletDid', { type: DataTypes.STRING });
  await queryInterface.addColumn('Datasets', 'knowledgeId', { type: DataTypes.STRING });
  await queryInterface.addColumn('Datasets', 'icon', { type: DataTypes.STRING });

  await queryInterface.addColumn('DatasetDocuments', 'filename', { type: DataTypes.STRING });
  await queryInterface.addColumn('DatasetDocuments', 'size', { type: DataTypes.BIGINT });
  await queryInterface.renameColumn('DatasetDocuments', 'datasetId', 'knowledgeId');
  await queryInterface.removeColumn('DatasetDocuments', 'content');

  await queryInterface.addColumn('DatasetEmbeddingHistories', 'contentHash', { type: DataTypes.STRING });
  await queryInterface.renameColumn('DatasetEmbeddingHistories', 'datasetId', 'knowledgeId');
  await queryInterface.removeColumn('DatasetEmbeddingHistories', 'targetVersion');
  await queryInterface.removeColumn('DatasetEmbeddingHistories', 'targetId');

  await queryInterface.removeColumn('DatasetSegments', 'targetId');

  await queryInterface.bulkDelete('DatasetEmbeddingHistories', {});
  await queryInterface.bulkDelete('DatasetSegments', {});

  await queryInterface.dropTable('DatasetUpdateHistories');

  // DatasetDocuments
  await queryInterface.addIndex('DatasetDocuments', ['knowledgeId']);
  await queryInterface.addIndex('DatasetEmbeddingHistories', ['knowledgeId']);
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameColumn('Datasets', 'projectId', 'appId');
  await queryInterface.removeColumn('Datasets', 'resourceBlockletDid');
  await queryInterface.removeColumn('Datasets', 'knowledgeId');
  await queryInterface.removeColumn('Datasets', 'icon');

  await queryInterface.removeColumn('DatasetDocuments', 'filename');
  await queryInterface.removeColumn('DatasetDocuments', 'size');
  await queryInterface.renameColumn('DatasetDocuments', 'knowledgeId', 'datasetId');
  await queryInterface.addColumn('DatasetDocuments', 'content', { type: DataTypes.TEXT });

  await queryInterface.removeColumn('DatasetEmbeddingHistories', 'contentHash');
  await queryInterface.renameColumn('DatasetEmbeddingHistories', 'knowledgeId', 'datasetId');
  await queryInterface.addColumn('DatasetEmbeddingHistories', 'targetVersion', { type: DataTypes.STRING });
  await queryInterface.addColumn('DatasetEmbeddingHistories', 'targetId', { type: DataTypes.STRING });

  await queryInterface.addColumn('DatasetSegments', 'targetId', { type: DataTypes.STRING });

  // DatasetDocuments
  await queryInterface.removeIndex('DatasetDocuments', ['knowledgeId']);
  await queryInterface.removeIndex('DatasetEmbeddingHistories', ['knowledgeId']);
};
