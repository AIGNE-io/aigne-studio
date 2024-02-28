import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Projects', 'gitDefaultBranch', { type: DataTypes.STRING, defaultValue: 'main' });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Projects', 'gitDefaultBranch');
};
