import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Histories', 'runType', { type: DataTypes.STRING });
  await queryInterface.addColumn('Histories', 'logs', { type: DataTypes.JSON });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Histories', 'runType');
  await queryInterface.removeColumn('Histories', 'logs');
};
