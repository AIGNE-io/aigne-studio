import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.changeColumn('Histories', 'userId', { type: DataTypes.STRING, allowNull: true });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.changeColumn('Histories', 'userId', { type: DataTypes.STRING, allowNull: false });
};
