import type { Migration } from '../migrate';
import Log from '../models/logs';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('Logs', Log.GENESIS_ATTRIBUTES);
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('Logs');
};
