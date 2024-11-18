import { DataTypes } from 'sequelize';

import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameColumn('Datasets', 'appId', 'projectId');
  await queryInterface.addColumn('Datasets', 'resourceBlockletDid', { type: DataTypes.STRING });
  await queryInterface.addColumn('Datasets', 'knowledgeId', { type: DataTypes.STRING });

  await queryInterface.addColumn('DatasetDocuments', 'path', { type: DataTypes.STRING });
  await queryInterface.addColumn('DatasetDocuments', 'size', { type: DataTypes.BIGINT });
  await queryInterface.addColumn('DatasetDocuments', 'summary', { type: DataTypes.TEXT });
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.renameColumn('Datasets', 'projectId', 'appId');
  await queryInterface.removeColumn('Datasets', 'resourceBlockletDid');
  await queryInterface.removeColumn('Datasets', 'knowledgeId');

  await queryInterface.removeColumn('DatasetDocuments', 'path');
  await queryInterface.removeColumn('DatasetDocuments', 'size');
  await queryInterface.removeColumn('DatasetDocuments', 'summary');
};
