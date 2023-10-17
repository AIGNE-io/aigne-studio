import { embeddingHistories } from '../embedding-history';
import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  const list = await embeddingHistories.cursor().sort({ updatedAt: -1 }).exec();

  if (list.length) {
    await queryInterface.bulkInsert('EmbeddingHistories', list);
  }
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.bulkDelete('EmbeddingHistories', {});
};
