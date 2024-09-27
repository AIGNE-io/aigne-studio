import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Deployments', 'productHuntUrl', { type: DataTypes.STRING });
  await queryInterface.addColumn('Deployments', 'productHuntBannerUrl', { type: DataTypes.STRING });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Deployments', 'productHuntUrl');
  await queryInterface.removeColumn('Deployments', 'productHuntBannerUrl');
};
