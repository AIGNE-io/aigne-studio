import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('AgentSecrets', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    aid: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
    apiSecret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('enabled', 'disabled'),
      allowNull: false,
      defaultValue: 'enabled',
    },
  });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('AgentSecrets');
};
