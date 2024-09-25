/* eslint-disable no-await-in-loop */
import { DataTypes, QueryTypes } from 'sequelize';

import { generateSlug } from '../../libs/utils';
import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('Categories', 'slug', { type: DataTypes.TEXT });

  const categories: Array<{ id: number; name: string }> = await queryInterface.sequelize.query(
    'SELECT id, name FROM "Categories"',
    { type: QueryTypes.SELECT }
  );

  for (const category of categories) {
    const slug = generateSlug(category.name);
    await queryInterface.sequelize.query('UPDATE "Categories" SET slug = ? WHERE id = ?', {
      replacements: [slug, category.id],
      type: QueryTypes.UPDATE,
    });
  }

  await queryInterface.changeColumn('Categories', 'slug', {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('Categories', 'slug');
};
