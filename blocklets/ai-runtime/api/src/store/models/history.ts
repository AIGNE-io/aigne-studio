import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class History extends Model<InferAttributes<History>, InferCreationAttributes<History>> {
  declare id: CreationOptional<string>;

  declare userId: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare projectId: string;

  declare agentId: string;

  declare sessionId: string;

  declare inputs?: { [key: string]: any } | null;

  declare outputs?: {
    content?: string;
    objects?: any[];
  } | null;

  declare steps?: {
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
    agentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
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
  },
  { sequelize }
);
