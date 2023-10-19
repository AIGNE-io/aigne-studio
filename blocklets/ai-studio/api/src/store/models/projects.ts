import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class Project extends Model<InferAttributes<Project>, InferCreationAttributes<Project>> {
  declare _id: string;

  declare name?: CreationOptional<string>;

  declare description?: CreationOptional<string>;

  declare model: string;

  declare createdAt?: CreationOptional<Date>;

  declare updatedAt?: CreationOptional<Date>;

  declare createdBy: CreationOptional<string>;

  declare updatedBy: CreationOptional<string>;

  declare pinnedAt?: CreationOptional<Date>;

  declare icon?: CreationOptional<string>;

  declare gitType?: CreationOptional<'simple' | 'default'>;

  declare temperature?: CreationOptional<number>;

  declare topP?: CreationOptional<number>;

  declare presencePenalty?: CreationOptional<number>;

  declare frequencyPenalty?: CreationOptional<number>;

  declare maxTokens?: CreationOptional<number>;

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
      allowNull: false,
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
    pinnedAt: {
      type: DataTypes.DATE,
    },
    icon: {
      type: DataTypes.STRING,
    },
    gitType: {
      type: DataTypes.STRING,
      defaultValue: 'default',
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
  };
}

Project.init(Project.GENESIS_ATTRIBUTES, { sequelize });
