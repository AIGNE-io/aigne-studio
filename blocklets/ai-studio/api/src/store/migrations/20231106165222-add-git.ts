import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Projects', 'gitUrl', { type: DataTypes.STRING, defaultValue: '' });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Projects', 'gitUrl');
};
