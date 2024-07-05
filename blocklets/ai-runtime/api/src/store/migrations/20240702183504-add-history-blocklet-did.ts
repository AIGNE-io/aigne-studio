import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Histories', 'blockletDid', { type: DataTypes.STRING });
  await queryInterface.addColumn('Histories', 'projectRef', { type: DataTypes.STRING });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Histories', 'blockletDid');
  await queryInterface.removeColumn('Histories', 'projectRef');
};
