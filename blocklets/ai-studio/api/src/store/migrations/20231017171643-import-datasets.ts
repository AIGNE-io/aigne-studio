import { datasets } from '../datasets';
import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  const list = await datasets.cursor().sort({ updatedAt: -1 }).exec();

  if (list.length) {
    await queryInterface.bulkInsert('Datasets', list);
  }
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.bulkDelete('Datasets', {});
};
