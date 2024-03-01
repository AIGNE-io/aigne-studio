import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('NewDatasetSegments', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    documentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    index: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
    },
    content: {
      type: DataTypes.STRING,
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
  await queryInterface.dropTable('NewDatasetSegments');
};
