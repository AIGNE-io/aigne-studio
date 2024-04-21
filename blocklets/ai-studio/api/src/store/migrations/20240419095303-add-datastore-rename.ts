import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameColumn('Datastores', 'type', 'key');
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameColumn('Datastores', 'key', 'type');
};
