import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Projects', 'titleFont', { type: DataTypes.STRING });
  await queryInterface.addColumn('Projects', 'bodyFont', { type: DataTypes.STRING });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Projects', 'titleFont');
  await queryInterface.removeColumn('Projects', 'bodyFont');
};
