import Sequelize from 'sequelize';

import { datasetItems } from '../dataset-items';
import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  const list = await datasetItems.cursor().sort({ updatedAt: -1 }).exec();

  if (list.length) {
    await queryInterface.bulkInsert('DatasetItems', list, {}, { data: { type: new Sequelize.JSON() } });
  }
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.bulkDelete('DatasetItems', {});
};
