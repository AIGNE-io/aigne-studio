import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';

import nextId from '../../../libs/next-id';
import { sequelize } from '../../sequelize';
import { UploadStatus } from './document';

export default class DatasetEmbeddingHistory extends Model<
  InferAttributes<DatasetEmbeddingHistory>,
  InferCreationAttributes<DatasetEmbeddingHistory>
> {
  declare id: CreationOptional<string>;

  declare knowledgeId: string;

  declare documentId: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare error?: string;

  declare startAt?: Date;

  declare endAt?: Date;

  declare status?: UploadStatus;

  declare contentHash?: string;
}

DatasetEmbeddingHistory.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    knowledgeId: {
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
  { sequelize }
);
