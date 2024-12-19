import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';

import nextId from '../../libs/next-id';
import { sequelize } from '../sequelize';

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

  declare knowledgeId: string;

  declare type: 'file' | 'text' | 'discussKit' | 'url';

  declare data?:
    | {
        type: 'file';
      }
    | {
        type: 'text';
      }
    | {
        type: 'discussKit';
        data: {
          id: string;
          title: string;
          type?: 'discussion' | 'blog' | 'doc';
          from: 'discussion' | 'board' | 'discussionType';
          boardId?: string;
        };
      }
    | {
        type: 'url';
        provider: 'jina' | 'firecrawl';
        url?: string;
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

  declare filename?: string;

  declare size?: number;
}

DatasetDocument.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    knowledgeId: {
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
    filename: {
      type: DataTypes.STRING,
    },
    size: {
      type: DataTypes.BIGINT,
    },
  },
  { sequelize }
);
