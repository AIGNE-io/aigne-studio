import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('Histories', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
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
    agentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    inputs: {
      type: DataTypes.JSON,
    },
    outputs: {
      type: DataTypes.JSON,
    },
    steps: {
      type: DataTypes.JSON,
    },
    error: {
      type: DataTypes.JSON,
    },
    status: {
      type: DataTypes.STRING,
    },
    usage: {
      type: DataTypes.JSON,
    },
  });

  await queryInterface.createTable('Memories', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sessionId: {
      type: DataTypes.STRING,
    },
    key: {
      type: DataTypes.STRING,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
    data: {
      type: DataTypes.JSON,
    },
    projectId: {
      type: DataTypes.STRING,
    },
    agentId: {
      type: DataTypes.STRING,
    },
    itemId: {
      type: DataTypes.STRING,
    },
    scope: {
      type: DataTypes.STRING,
    },
  });

  await queryInterface.createTable('Secrets', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    projectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    targetProjectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    targetAgentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    targetInputKey: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    secret: {
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
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  await queryInterface.createTable('Sessions', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
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
    name: {
      type: DataTypes.STRING,
    },
    projectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    agentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('Histories');
  await queryInterface.dropTable('Memories');
  await queryInterface.dropTable('Secrets');
  await queryInterface.dropTable('Sessions');
};
