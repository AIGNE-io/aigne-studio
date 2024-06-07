import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameColumn('Projects', '_id', 'id');
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameColumn('Projects', 'id', '_id');
};
