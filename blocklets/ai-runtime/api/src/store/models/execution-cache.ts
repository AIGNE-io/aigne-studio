import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class ExecutionCache extends Model<
  InferAttributes<ExecutionCache>,
  InferCreationAttributes<ExecutionCache>
> {
  declare id: CreationOptional<string>;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare blockletDid?: string;

  declare projectId: string;

  declare projectRef?: string;

  declare agentId: string;

  declare cacheKey: string;

  declare inputs: { [key: string]: any };

  declare outputs: { [key: string]: any };
}

ExecutionCache.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    blockletDid: {
      type: DataTypes.STRING,
    },
    projectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    projectRef: {
      type: DataTypes.STRING,
    },
    agentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cacheKey: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    inputs: {
      type: DataTypes.JSON,
    },
    outputs: {
      type: DataTypes.JSON,
    },
  },
  { sequelize }
);
