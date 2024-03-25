import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();
export default class DatasetUpdateHistory extends Model<
  InferAttributes<DatasetUpdateHistory>,
  InferCreationAttributes<DatasetUpdateHistory>
> {
  declare id: CreationOptional<string>;

  declare datasetId: string;

  declare documentId: string;

  declare segmentId: string[];

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;
}

DatasetUpdateHistory.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    datasetId: {
      type: DataTypes.STRING,
    },
    documentId: {
      type: DataTypes.STRING,
    },
    segmentId: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
  },
  { sequelize }
);
