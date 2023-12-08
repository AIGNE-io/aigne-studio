import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../sequelize';

const idGenerator = new Worker();

export const nextId = () => idGenerator.nextId().toString();

export default class Project extends Model<InferAttributes<Project>, InferCreationAttributes<Project>> {
  declare _id: CreationOptional<string>;

  declare name?: string;

  declare description?: string;

  declare model: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare createdBy: string;

  declare updatedBy: string;

  declare pinnedAt?: Date;

  declare icon?: string;

  declare gitType?: 'simple' | 'default';

  declare temperature?: number;

  declare topP?: number;

  declare presencePenalty?: number;

  declare frequencyPenalty?: number;

  declare maxTokens?: number;

  declare gitUrl?: string;

  declare gitAutoSync?: boolean;

  declare gitLastSyncedAt?: Date;

  public static readonly GENESIS_ATTRIBUTES = {
    _id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    name: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.STRING,
    },
    model: {
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
    },
    updatedBy: {
      type: DataTypes.STRING,
    },
    pinnedAt: {
      type: DataTypes.DATE,
    },
    icon: {
      type: DataTypes.STRING,
    },
    gitType: {
      type: DataTypes.STRING,
      defaultValue: 'simple',
    },
    temperature: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
    },
    topP: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
    },
    presencePenalty: {
      type: DataTypes.FLOAT,
    },
    frequencyPenalty: {
      type: DataTypes.FLOAT,
    },
    maxTokens: {
      type: DataTypes.FLOAT,
    },
    gitUrl: {
      type: DataTypes.STRING,
    },
    gitAutoSync: {
      type: DataTypes.BOOLEAN,
    },
    gitLastSyncedAt: {
      type: DataTypes.DATE,
    },
  };
}

Project.init(Project.GENESIS_ATTRIBUTES, { sequelize });
