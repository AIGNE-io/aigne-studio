import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';

import nextId from '../../libs/get-id';
import { sequelize } from '../sequelize';

export default class Secret extends Model<InferAttributes<Secret>, InferCreationAttributes<Secret>> {
  declare id: CreationOptional<string>;

  declare projectId: string;

  declare targetProjectId: string;

  declare targetAgentId: string;

  declare targetInputKey: string;

  declare secret: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare createdBy: string;

  declare updatedBy: string;
}

Secret.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    projectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    targetProjectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    targetAgentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    targetInputKey: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    secret: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { sequelize }
);
