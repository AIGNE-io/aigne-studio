import type { Migration } from '../migrate';
import { projects } from '../projects';

export const up: Migration = async ({ context: queryInterface }) => {
  const list = await projects.cursor().sort({ updatedAt: -1 }).exec();

  if (list.length) {
    await queryInterface.bulkInsert('Projects', list);
  }
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.bulkDelete('Projects', {});
};
