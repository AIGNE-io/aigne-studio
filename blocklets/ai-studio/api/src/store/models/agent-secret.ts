import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class AgentSecret extends Model<InferAttributes<AgentSecret>, InferCreationAttributes<AgentSecret>> {
  declare id: CreationOptional<string>;

  declare aid: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare apiSecret?: string;

  declare status: 'enabled' | 'disabled';
}

AgentSecret.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    aid: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
    apiSecret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('enabled', 'disabled'),
      allowNull: false,
      defaultValue: 'disabled',
    },
  },
  { sequelize }
);
