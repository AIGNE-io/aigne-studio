import { DataTypes, QueryInterface } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  await queryInterface.createTable('KnowledgeDocuments', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
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
    filename: {
      type: DataTypes.STRING,
    },
    size: {
      type: DataTypes.BIGINT,
    },
  });

  await queryInterface.createTable('KnowledgeEmbeddingHistories', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
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
    contentHash: {
      type: DataTypes.STRING,
    },
  });

  await queryInterface.createTable('KnowledgeSegments', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    documentId: {
      type: DataTypes.STRING,
      allowNull: false,
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
  await queryInterface.dropTable('KnowledgeDocuments');
  await queryInterface.dropTable('KnowledgeEmbeddingHistories');
  await queryInterface.dropTable('KnowledgeSegments');
};
