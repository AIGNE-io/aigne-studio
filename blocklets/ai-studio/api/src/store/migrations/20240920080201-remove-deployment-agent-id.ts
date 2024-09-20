import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Deployments', 'agentId');
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Deployments', 'agentId', { type: DataTypes.STRING });
};
