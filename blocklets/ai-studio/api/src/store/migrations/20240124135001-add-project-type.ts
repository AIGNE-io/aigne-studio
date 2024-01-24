import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Projects', 'projectType', { type: DataTypes.STRING });
  await queryInterface.addColumn('Projects', 'homePageUrl', { type: DataTypes.STRING });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Projects', 'projectType');
  await queryInterface.removeColumn('Projects', 'homePageUrl');
};
