import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Datastores', 'scope', { type: DataTypes.STRING });
  await queryInterface.addColumn('Datastores', 'dataType', { type: DataTypes.JSON });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Datastores', 'scope', { type: DataTypes.STRING });
  await queryInterface.addColumn('Datastores', 'dataType', { type: DataTypes.JSON });
};
