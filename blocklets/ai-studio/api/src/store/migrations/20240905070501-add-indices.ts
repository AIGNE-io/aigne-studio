import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addIndex('Projects', ['createdBy']);
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeIndex('Projects', ['createdBy']);
};
