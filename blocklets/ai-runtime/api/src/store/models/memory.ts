import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';

import nextId from '../../libs/next-id';
import { sequelize } from '../sequelize';

export default class Memory extends Model<InferAttributes<Memory>, InferCreationAttributes<Memory>> {
  declare id: CreationOptional<string>;

  declare userId: string;

  declare sessionId?: string;

  declare projectId?: string;

  declare agentId?: string;

  declare itemId?: string;

  declare key?: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare data?: any;

  declare scope?: 'session' | 'user' | 'global';
}

Memory.init(
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
    sessionId: {
      type: DataTypes.STRING,
    },
    key: {
      type: DataTypes.STRING,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
    data: {
      type: DataTypes.JSON,
    },
    projectId: {
      type: DataTypes.STRING,
    },
    agentId: {
      type: DataTypes.STRING,
    },
    itemId: {
      type: DataTypes.STRING,
    },
    scope: {
      type: DataTypes.STRING,
    },
  },
  { sequelize }
);
