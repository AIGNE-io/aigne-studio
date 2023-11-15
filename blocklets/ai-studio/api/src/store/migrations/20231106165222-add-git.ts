import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Projects', 'gitUrl', { type: DataTypes.STRING });
  await queryInterface.addColumn('Projects', 'gitAutoSync', { type: DataTypes.BOOLEAN });
  await queryInterface.addColumn('Projects', 'gitLastSyncedAt', { type: DataTypes.DATE });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Projects', 'gitUrl');
  await queryInterface.removeColumn('Projects', 'gitAutoSync');
  await queryInterface.removeColumn('Projects', 'gitLastSyncedAt');
};
