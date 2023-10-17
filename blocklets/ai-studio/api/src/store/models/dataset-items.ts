import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

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
    },
    name: {
      type: DataTypes.STRING,
    },
    data: {
      type: DataTypes.JSON,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    createdBy: {
      type: DataTypes.STRING,
    },
    updatedBy: {
      type: DataTypes.STRING,
    },
    embeddedAt: {
      type: DataTypes.DATE,
    },
    error: {
      type: DataTypes.STRING,
    },
  };

  public static initialize(sequelize: any) {
    this.init(DatasetItem.GENESIS_ATTRIBUTES, { sequelize });
  }
}
