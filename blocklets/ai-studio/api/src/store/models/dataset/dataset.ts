import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';

import nextId from '../../../libs/next-id';
import { sequelize } from '../../sequelize';

export default class Dataset extends Model<InferAttributes<Dataset>, InferCreationAttributes<Dataset>> {
  declare id: CreationOptional<string>;

  declare name?: string;

  declare description?: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare createdBy: string;

  declare updatedBy: string;

  declare documents?: number;

  declare projectId?: string;

  declare resourceBlockletDid?: string;

  declare knowledgeId?: string;

  declare icon?: string;
}

Dataset.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    name: {
      type: DataTypes.STRING,
    },
    description: {
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
    projectId: {
      type: DataTypes.STRING,
    },
    resourceBlockletDid: {
      type: DataTypes.STRING,
    },
    knowledgeId: {
      type: DataTypes.STRING,
    },
  },
  { sequelize }
);
