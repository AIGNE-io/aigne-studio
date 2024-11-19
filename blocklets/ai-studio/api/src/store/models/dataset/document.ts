import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';

import nextId from '../../../libs/next-id';
import { sequelize } from '../../sequelize';

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

  declare type: 'discussion' | 'text' | 'file' | 'fullSite' | 'discussKit' | 'crawl'; // 'discussion'和'fullSite'已经废弃，统一使用 'discussKit'

  declare data?:
    | {
        type: 'file';
        hash: string;
        name: string;
        size: number;
        fileType: string;
        relativePath: string;
      }
    | {
        type: 'text';
        title: string;
        content: string;
      }
    | {
        type: 'discussKit';
        data: {
          id: string;
          title: string;
          type?: 'discussion' | 'blog' | 'doc';
          from: 'discussion' | 'board' | 'discussionType';
        };
      }
    | { type: 'crawl'; provider: 'jina' | 'firecrawl'; apiKey?: string; url?: string };

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

  declare path?: string;

  declare size?: number;

  declare summary?: string;
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
    path: {
      type: DataTypes.STRING,
    },
    size: {
      type: DataTypes.BIGINT,
    },
    summary: {
      type: DataTypes.TEXT,
    },
  },
  { sequelize }
);
