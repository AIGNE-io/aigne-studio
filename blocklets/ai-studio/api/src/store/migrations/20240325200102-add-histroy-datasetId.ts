import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('DatasetEmbeddingHistories', 'datasetId', { type: DataTypes.STRING });

  await queryInterface.createTable('DatasetUpdateHistories', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    datasetId: {
      type: DataTypes.STRING,
    },
    documentId: {
      type: DataTypes.STRING,
    },
    segmentId: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
  });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('DatasetEmbeddingHistories', 'datasetId');
  await queryInterface.dropTable('DatasetUpdateHistories');
};
