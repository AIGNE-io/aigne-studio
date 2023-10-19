import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class DatasetItem extends Model<InferAttributes<DatasetItem>, InferCreationAttributes<DatasetItem>> {
  declare _id: CreationOptional<string>;

  declare datasetId: string;

  declare name: CreationOptional<string>;

  declare data: CreationOptional<
    | {
        type: 'discussion';
        fullSite?: false;
        id: string;
      }
    | {
        type: 'discussion';
        fullSite: true;
        id?: undefined;
      }
  >;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare createdBy: string;

  declare updatedBy: string;

  declare embeddedAt: CreationOptional<Date>;

  declare error: CreationOptional<string>;

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
