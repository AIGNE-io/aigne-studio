import type { ExecuteBlock } from '@blocklet/ai-runtime/types';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class History extends Model<InferAttributes<History>, InferCreationAttributes<History>> {
  declare id: CreationOptional<string>;

  declare taskId: string;

  declare userId: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare projectId: string;

  declare ref: string;

  declare assistantId: string;

  declare sessionId?: string;

  declare parameters?: { [key: string]: any };

  declare result?: {
    content?: string;
    images?: { url: string }[];
    messages?: {
      taskId: string;
      respondAs?: ExecuteBlock['respondAs'];
      result?: Pick<NonNullable<History['result']>, 'content' | 'images'>;
    }[];
    objects?: { taskId: string; data: any }[];
  } | null;

  declare executingLogs?: {
    taskId: string;
    assistantId: string;
    startTime: string;
    endTime: string;
    input?: { messages?: { role: string; content: string }[] };
    content?: string;
    images?: { url: string }[];
  }[];

  declare error?: { message: string } | null;

  declare generateStatus?: 'generating' | 'done';

  // @deprecated: 用量上报状态
  // counted: 已经把这条记录作为**提交点**（但有可能因为上报失败而没有变为 reported）
  // reported: 已经把上一个**提交点**到这条记录间的 usage 上报至 payment
  declare usageReportStatus?: null | 'counted' | 'reported';

  declare usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

History.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    taskId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
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
    ref: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assistantId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sessionId: {
      type: DataTypes.STRING,
    },
    parameters: {
      type: DataTypes.JSON,
    },
    result: {
      type: DataTypes.JSON,
    },
    executingLogs: {
      type: DataTypes.JSON,
    },
    error: {
      type: DataTypes.JSON,
    },
    generateStatus: {
      type: DataTypes.STRING,
    },
    usageReportStatus: {
      type: DataTypes.STRING,
    },
    usage: {
      type: DataTypes.JSON,
    },
  },
  { sequelize }
);
