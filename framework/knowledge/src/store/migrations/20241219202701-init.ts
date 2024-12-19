import { DataTypes, QueryInterface } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  await queryInterface.createTable('DatasetDocuments', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    datasetId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
    },
    data: {
      type: DataTypes.JSON,
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
    error: {
      type: DataTypes.STRING,
    },
    embeddingStartAt: {
      type: DataTypes.DATE,
    },
    embeddingEndAt: {
      type: DataTypes.DATE,
    },
    embeddingStatus: {
      type: DataTypes.STRING,
    },
  });

  await queryInterface.createTable('DatasetEmbeddingHistories', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    targetId: {
      type: DataTypes.STRING,
    },
    datasetId: {
      type: DataTypes.STRING,
    },
    documentId: {
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
    startAt: {
      type: DataTypes.DATE,
    },
    endAt: {
      type: DataTypes.DATE,
    },
    status: {
      type: DataTypes.STRING,
    },
  });

  await queryInterface.createTable('DatasetSegments', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    documentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    targetId: {
      type: DataTypes.STRING,
    },
    content: {
      type: DataTypes.TEXT,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
  });
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  await queryInterface.dropTable('DatasetDocuments');
  await queryInterface.dropTable('DatasetEmbeddingHistories');
  await queryInterface.dropTable('DatasetSegments');
};
