import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addIndex('Releases', ['projectId', 'projectRef', 'assistantId'], { unique: true });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeIndex('Releases', ['projectId', 'projectRef', 'assistantId'], { unique: true });
};
