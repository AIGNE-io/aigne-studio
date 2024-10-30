/* eslint-disable no-await-in-loop */
import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Histories', 'requestType', { type: DataTypes.STRING });
  await queryInterface.addColumn('Histories', 'projectOwnerId', { type: DataTypes.STRING });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Histories', 'requestType');
  await queryInterface.removeColumn('Histories', 'projectOwnerId');
};
