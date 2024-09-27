/* eslint-disable no-await-in-loop */
import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Categories', 'orderIndex', {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  });
  await queryInterface.addColumn('Deployments', 'orderIndex', {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Categories', 'orderIndex');
  await queryInterface.removeColumn('Deployments', 'orderIndex');
};
