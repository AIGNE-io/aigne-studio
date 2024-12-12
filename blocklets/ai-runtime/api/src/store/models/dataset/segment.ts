import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class DatasetSegment extends Model<
  InferAttributes<DatasetSegment>,
  InferCreationAttributes<DatasetSegment>
> {
  declare id: CreationOptional<string>;

  declare documentId: string;

  declare content?: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;
}

DatasetSegment.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    documentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
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
