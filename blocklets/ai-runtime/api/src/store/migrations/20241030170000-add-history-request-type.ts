/* eslint-disable no-await-in-loop */
import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Histories', 'requestType', { type: DataTypes.STRING });
  await queryInterface.addColumn('Histories', 'projectOwnerId', { type: DataTypes.STRING });

  await queryInterface.addIndex('Histories', ['requestType']);
  await queryInterface.addIndex('Histories', ['projectOwnerId']);
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeIndex('Histories', ['requestType']);
  await queryInterface.removeIndex('Histories', ['projectOwnerId']);

  await queryInterface.removeColumn('Histories', 'requestType');
  await queryInterface.removeColumn('Histories', 'projectOwnerId');
};
