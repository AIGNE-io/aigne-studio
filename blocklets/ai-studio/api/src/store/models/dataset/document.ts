import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export enum UploadStatus {
  Idle = 'idle',
  Uploading = 'uploading',
  Success = 'success',
  Error = 'error',
}

export default class DatasetDocument extends Model<
  InferAttributes<DatasetDocument>,
  InferCreationAttributes<DatasetDocument>
> {
  declare id: CreationOptional<string>;

  declare datasetId: string;

  declare type: 'discussion' | 'text' | 'file' | 'fullSite';

  declare data?:
    | {
        type: 'text';
        content: string;
      }
    | {
        type: 'discussion';
        id: string;
      }
    | {
        type: 'fullSite';
        ids: string[];
      }
    | {
        type: string;
        path: string;
      };

  declare name?: string;

  declare content?: any;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare createdBy: string;

  declare updatedBy: string;

  declare error?: string | null;

  declare embeddingStartAt?: Date;

  declare embeddingEndAt?: Date;

  declare embeddingStatus?: UploadStatus | string;
}

DatasetDocument.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
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
  },
  { sequelize }
);
