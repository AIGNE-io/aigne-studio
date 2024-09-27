import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('CronHistories', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
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
    blockletDid: {
      type: DataTypes.STRING,
    },
    projectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    projectRef: {
      type: DataTypes.STRING,
    },
    agentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cronJobId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    inputs: {
      type: DataTypes.JSON,
    },
    outputs: {
      type: DataTypes.JSON,
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    error: {
      type: DataTypes.JSON,
    },
  });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('CronHistories');
};
