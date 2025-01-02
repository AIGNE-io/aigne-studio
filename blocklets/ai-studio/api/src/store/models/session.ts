import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class Session extends Model<InferAttributes<Session>, InferCreationAttributes<Session>> {
  declare id: CreationOptional<string>;

  declare userId: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare name?: string;

  declare projectId: string;

  declare projectRef: string;

  declare assistantId: string;

  declare parameters?: { [key: string]: any };

  declare entry?: { id: string; title?: string };

  static getUserSessions({
    userId,
    projectId,
    projectRef,
    assistantId,
  }: {
    userId: string;
    projectId: string;
    projectRef: string;
    assistantId: string;
  }) {
    return this.findAll({
      where: { userId, projectId, projectRef, assistantId },
      order: [['id', 'desc']],
    });
  }
}

Session.init(
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
    name: {
      type: DataTypes.STRING,
    },
    projectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    projectRef: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'ref',
    },
    assistantId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    parameters: {
      type: DataTypes.JSON,
    },
    entry: {
      type: DataTypes.JSON,
    },
  },
  { sequelize }
);
