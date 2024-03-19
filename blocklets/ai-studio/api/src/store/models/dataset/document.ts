import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class NewDatasetItem extends Model<
  InferAttributes<NewDatasetItem>,
  InferCreationAttributes<NewDatasetItem>
> {
  declare id: CreationOptional<string>;

  declare datasetId: string;

  declare name?: string;

  declare type: 'discussion' | 'text' | 'md' | 'txt' | 'pdf' | 'doc';

  declare data?:
    | {
        type: 'text';
        content: string;
      }
    | {
        type: 'discussion';
        fullSite?: boolean;
        id?: string;
      }
    | {
        type: 'md';
        path: string;
      }
    | {
        type: 'txt';
        path: string;
      }
    | {
        type: 'pdf';
        path: string;
      }
    | {
        type: 'doc';
        path: string;
      };

  declare content?: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare createdBy: string;

  declare updatedBy: string;

  declare error?: string | null;
}

NewDatasetItem.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    datasetId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
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
    error: {
      type: DataTypes.STRING,
    },
  },
  { sequelize }
);
