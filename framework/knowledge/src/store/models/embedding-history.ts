import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import type { Sequelize } from 'sequelize';

import nextId from '../../libs/next-id';
import { UploadStatus } from './document';

export default class KnowledgeEmbeddingHistory extends Model<
  InferAttributes<KnowledgeEmbeddingHistory>,
  InferCreationAttributes<KnowledgeEmbeddingHistory>
> {
  declare id: CreationOptional<string>;

  declare documentId: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare error?: string;

  declare startAt?: Date;

  declare endAt?: Date;

  declare status?: UploadStatus;

  declare contentHash?: string;
}

export const init = (sequelize: Sequelize) => {
  KnowledgeEmbeddingHistory.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        defaultValue: nextId,
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
    },
    { sequelize: sequelize }
  );
};
