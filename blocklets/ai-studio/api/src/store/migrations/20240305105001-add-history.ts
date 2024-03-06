import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('Histories', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    taskId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    projectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ref: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assistantId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sessionId: {
      type: DataTypes.STRING,
    },
    parameters: {
      type: DataTypes.JSON,
    },
    result: {
      type: DataTypes.JSON,
    },
    executingLogs: {
      type: DataTypes.JSON,
    },
    error: {
      type: DataTypes.JSON,
    },
    generateStatus: {
      type: DataTypes.STRING,
    },
  });

  await queryInterface.addIndex('Histories', ['projectId', 'assistantId', 'userId', 'sessionId']);
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('Histories');
};
