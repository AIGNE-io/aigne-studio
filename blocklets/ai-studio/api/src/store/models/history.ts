import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';

import nextId from '../../libs/next-id';
import { sequelize } from '../sequelize';

export default class History extends Model<InferAttributes<History>, InferCreationAttributes<History>> {
  declare id: CreationOptional<string>;

  declare userId?: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare projectId: string;

  declare projectRef?: string;

  declare agentId: string;

  declare sessionId: string;

  declare blockletDid?: string;

  declare inputs?: { [key: string]: any } | null;

  declare outputs?: {
    content?: string;
    objects?: any[];
  } | null;

  declare steps?: {
    // 废弃，使用 logs 代替
    id: string;
    agentId: string;
    startTime: string;
    endTime: string;
    objects?: any[];
  }[];

  declare error?: { message: string } | null;

  declare status?: 'generating' | 'done';

  declare usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  declare runType?: 'cron' | 'webhook' | 'agent';

  declare logs?: any[];
}

History.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    userId: {
      type: DataTypes.STRING,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    projectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    projectRef: {
      type: DataTypes.STRING,
    },
    agentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    blockletDid: {
      type: DataTypes.STRING,
    },
    inputs: {
      type: DataTypes.JSON,
    },
    outputs: {
      type: DataTypes.JSON,
    },
    steps: {
      type: DataTypes.JSON,
    },
    error: {
      type: DataTypes.JSON,
    },
    status: {
      type: DataTypes.STRING,
    },
    usage: {
      type: DataTypes.JSON,
    },
    runType: {
      type: DataTypes.STRING,
    },
    logs: {
      type: DataTypes.JSON,
    },
  },
  { sequelize }
);
