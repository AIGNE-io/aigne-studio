import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export enum Status {
  PANGING = 0,
  SUCCESS = 1,
  FAIL = 2,
}

export interface LogKeys {
  templateId?: string;
  hash?: string;
  projectId?: string;
  prompts?: any[];
  parameters?: {};
  response?: {};
  startDate?: Date;
  endDate?: Date;
  requestTime?: number;
  status?: Status;
  error?: string;
  parentId?: string;
}

export default class Log extends Model<InferAttributes<Log>, InferCreationAttributes<Log>> {
  declare id: CreationOptional<string>;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare templateId?: string;

  declare hash?: string;

  declare projectId?: string;

  declare prompts?: any[];

  declare parameters?: {};

  declare response?: {};

  declare startDate?: Date;

  declare endDate?: Date;

  declare requestTime?: number;

  declare status?: Status;

  declare error?: string;

  declare parentId?: string;
}

Log.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
    templateId: {
      type: DataTypes.STRING,
    },
    hash: {
      type: DataTypes.STRING,
    },
    projectId: {
      type: DataTypes.STRING,
    },
    prompts: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    parameters: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    response: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    startDate: {
      type: DataTypes.DATE,
    },
    endDate: {
      type: DataTypes.DATE,
    },
    requestTime: {
      type: DataTypes.INTEGER,
    },
    status: {
      type: DataTypes.INTEGER,
      defaultValue: Status.PANGING,
    },
    error: {
      type: DataTypes.STRING,
    },
    parentId: {
      type: DataTypes.STRING,
    },
  },
  { sequelize }
);
