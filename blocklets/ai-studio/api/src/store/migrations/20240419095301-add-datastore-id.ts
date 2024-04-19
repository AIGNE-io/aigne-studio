import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Datastores', 'projectId', { type: DataTypes.STRING });
  await queryInterface.addColumn('Datastores', 'assistantId', { type: DataTypes.STRING });
  await queryInterface.addColumn('Datastores', 'itemId', { type: DataTypes.STRING });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Datastores', 'projectId');
  await queryInterface.removeColumn('Datastores', 'assistantId');
  await queryInterface.removeColumn('Datastores', 'itemId');
};
