import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('AgentUsages', {
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
    projectRef: {
      type: DataTypes.STRING,
    },
    agentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    blockletDid: {
      type: DataTypes.STRING,
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
    usage: {
      type: DataTypes.JSON,
    },
    requestType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    projectOwnerId: {
      type: DataTypes.STRING,
    },
  });

  await queryInterface.addIndex('AgentUsages', ['userId']);
  await queryInterface.addIndex('AgentUsages', ['projectId']);
  await queryInterface.addIndex('AgentUsages', ['requestType']);
  await queryInterface.addIndex('AgentUsages', ['projectOwnerId']);

  await queryInterface.removeColumn('Histories', 'requestType');
  await queryInterface.removeColumn('Histories', 'projectOwnerId');
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('AgentUsages');

  await queryInterface.addColumn('Histories', 'requestType', { type: DataTypes.STRING });
  await queryInterface.addColumn('Histories', 'projectOwnerId', { type: DataTypes.STRING });
};
