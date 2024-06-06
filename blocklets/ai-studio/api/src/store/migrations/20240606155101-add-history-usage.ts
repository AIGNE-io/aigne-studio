import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Histories', 'usage', { type: DataTypes.JSON });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Histories', 'usage');
};
