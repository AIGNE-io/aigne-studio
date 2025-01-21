import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';
import { existsColumn } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  if (!(await existsColumn(queryInterface, 'Projects', 'didSpaceAutoSync'))) {
    // @note: 每个 project 都是默认开启自动同步的
    await queryInterface.addColumn('Projects', 'didSpaceAutoSync', { type: DataTypes.BOOLEAN, defaultValue: true });
  }
  if (!(await existsColumn(queryInterface, 'Projects', 'didSpaceLastSyncedAt'))) {
    await queryInterface.addColumn('Projects', 'didSpaceLastSyncedAt', { type: DataTypes.DATE });
  }
};

export const down: Migration = async ({ context: queryInterface }) => {
  if (await existsColumn(queryInterface, 'Projects', 'didSpaceAutoSync')) {
    await queryInterface.removeColumn('Projects', 'didSpaceAutoSync');
  }
  if (await existsColumn(queryInterface, 'Projects', 'didSpaceLastSyncedAt')) {
    await queryInterface.removeColumn('Projects', 'didSpaceLastSyncedAt');
  }
};
