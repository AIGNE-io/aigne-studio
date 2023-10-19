import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class DatasetItem extends Model<InferAttributes<DatasetItem>, InferCreationAttributes<DatasetItem>> {
  declare _id?: string;

  declare datasetId: string;

  declare name?: string;

  declare data?:
    | {
        type: 'discussion';
        fullSite?: false;
        id: string;
      }
    | {
        type: 'discussion';
        fullSite: true;
        id?: undefined;
      };

  declare createdAt?: Date;

  declare updatedAt?: Date;

  declare createdBy: string;

  declare updatedBy: string;

  declare embeddedAt?: Date;

  declare error?: string;

  public static readonly GENESIS_ATTRIBUTES = {
    _id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    datasetId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
    },
    data: {
      type: DataTypes.JSON,
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
    embeddedAt: {
      type: DataTypes.DATE,
    },
    error: {
      type: DataTypes.STRING,
    },
  };
}

DatasetItem.init(DatasetItem.GENESIS_ATTRIBUTES, { sequelize });
