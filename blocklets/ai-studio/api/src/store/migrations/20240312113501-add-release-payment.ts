import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Releases', 'paymentEnabled', { type: DataTypes.BOOLEAN });
  await queryInterface.addColumn('Releases', 'paymentProductId', { type: DataTypes.STRING });
  await queryInterface.addColumn('Releases', 'paymentLinkId', { type: DataTypes.STRING });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Releases', 'paymentEnabled');
  await queryInterface.removeColumn('Releases', 'paymentProductId');
  await queryInterface.removeColumn('Releases', 'paymentLinkId');
};
