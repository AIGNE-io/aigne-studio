import Sequelize, { DataTypes } from 'sequelize';

import { datasetItems } from '../0.1.157/dataset-items';
import { datasets } from '../0.1.157/datasets';
import { embeddingHistories } from '../0.1.157/embedding-history';
import { projects } from '../0.1.157/projects';
import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('Projects', {
    _id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.STRING,
    },
    model: {
      type: DataTypes.STRING,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
    createdBy: {
      type: DataTypes.STRING,
    },
    updatedBy: {
      type: DataTypes.STRING,
    },
    pinnedAt: {
      type: DataTypes.DATE,
    },
    icon: {
      type: DataTypes.STRING,
    },
    gitType: {
      type: DataTypes.STRING,
      defaultValue: 'simple',
    },
    temperature: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
    },
    topP: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
    },
    presencePenalty: {
      type: DataTypes.FLOAT,
    },
    frequencyPenalty: {
      type: DataTypes.FLOAT,
    },
    maxTokens: {
      type: DataTypes.FLOAT,
    },
  });
  await queryInterface.createTable('EmbeddingHistories', {
    _id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    targetId: {
      type: DataTypes.STRING,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
    targetVersion: {
      type: DataTypes.DATE,
    },
    error: {
      type: DataTypes.STRING,
    },
  });
  await queryInterface.createTable('Datasets', {
    _id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });
  await queryInterface.createTable('DatasetItems', {
    _id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    datasetId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
    },
    data: {
      type: DataTypes.JSON,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    embeddedAt: {
      type: DataTypes.DATE,
    },
    error: {
      type: DataTypes.STRING,
    },
  });

  const projectRows = await projects.cursor().sort({ updatedAt: -1 }).exec();
  if (projectRows.length) {
    await queryInterface.bulkInsert('Projects', projectRows);
  }

  const datasetRows = await datasets.cursor().sort({ updatedAt: -1 }).exec();
  if (datasetRows.length) {
    await queryInterface.bulkInsert('Datasets', datasetRows);
  }

  const datasetItemRows = await datasetItems.cursor().sort({ updatedAt: -1 }).exec();
  if (datasetItemRows.length) {
    await queryInterface.bulkInsert('DatasetItems', datasetItemRows, {}, { data: { type: new Sequelize.JSON() } });
  }

  const embeddingHistoriesRows = await embeddingHistories.cursor().sort({ updatedAt: -1 }).exec();
  if (embeddingHistoriesRows.length) {
    await queryInterface.bulkInsert('EmbeddingHistories', embeddingHistoriesRows);
  }
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('Projects');
  await queryInterface.dropTable('EmbeddingHistories');
  await queryInterface.dropTable('Datasets');
  await queryInterface.dropTable('DatasetItems');
};
