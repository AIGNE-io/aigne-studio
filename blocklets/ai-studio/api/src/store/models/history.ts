import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
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

  declare result?: { content?: string; images?: { url: string }[] } | object;

  declare executingLogs?: {
    taskId: string;
    assistantId: string;
    startTime: string;
    endTime: string;
    input?: { messages?: { role: string; content: string }[] };
    content?: string;
    images?: { url: string }[];
  }[];

  declare error?: { message: string };

  declare generateStatus?: 'generating' | 'done';
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
  },
  { sequelize }
);
