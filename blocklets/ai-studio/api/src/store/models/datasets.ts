import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class Dataset extends Model<InferAttributes<Dataset>, InferCreationAttributes<Dataset>> {
  declare _id?: string;

  declare name?: string;

  declare createdAt?: Date;

  declare updatedAt?: Date;

  declare createdBy: string;

  declare updatedBy: string;

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
  };
}

Dataset.init(Dataset.GENESIS_ATTRIBUTES, { sequelize });
