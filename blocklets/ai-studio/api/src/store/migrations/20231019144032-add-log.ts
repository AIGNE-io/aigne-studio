import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';
import { Status } from '../models/logs';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('Logs', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
    templateId: {
      type: DataTypes.STRING,
    },
    hash: {
      type: DataTypes.STRING,
    },
    projectId: {
      type: DataTypes.STRING,
    },
    prompts: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    parameters: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    response: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    startDate: {
      type: DataTypes.DATE,
    },
    endDate: {
      type: DataTypes.DATE,
    },
    requestTime: {
      type: DataTypes.INTEGER,
    },
    status: {
      type: DataTypes.INTEGER,
      defaultValue: Status.PANGING,
    },
    error: {
      type: DataTypes.STRING,
    },
    parentId: {
      type: DataTypes.STRING,
    },
  });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('Logs');
};
