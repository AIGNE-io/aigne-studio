import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class AgentInputSecret extends Model<
  InferAttributes<AgentInputSecret>,
  InferCreationAttributes<AgentInputSecret>
> {
  declare id: CreationOptional<string>;

  declare projectId: string;

  declare targetProjectId: string;

  declare targetAgentId: string;

  declare targetInputKey: string;

  declare secret: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare createdBy: string;

  declare updatedBy: string;
}

AgentInputSecret.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    projectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    targetProjectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    targetAgentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    targetInputKey: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    secret: {
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
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { sequelize }
);
