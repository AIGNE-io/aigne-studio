/* eslint-disable no-await-in-loop */
import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Deployments', 'aigneBannerVisible', { type: DataTypes.BOOLEAN, defaultValue: true });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Deployments', 'aigneBannerVisible');
};
