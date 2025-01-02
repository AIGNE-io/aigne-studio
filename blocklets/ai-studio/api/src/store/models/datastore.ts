import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class Datastore extends Model<InferAttributes<Datastore>, InferCreationAttributes<Datastore>> {
  declare id: CreationOptional<string>;

  declare sessionId?: string;

  declare userId: string;

  declare projectId?: string;

  declare assistantId?: string;

  declare itemId?: string;

  declare key?: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare data?: {};

  declare scope?: 'session' | 'user' | 'global';
}

Datastore.init(
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
    assistantId: {
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
