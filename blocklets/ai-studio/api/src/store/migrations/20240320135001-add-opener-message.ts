import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Releases', 'openerMessage', { type: DataTypes.TEXT });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Releases', 'openerMessage');
};
