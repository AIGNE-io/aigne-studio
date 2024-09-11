import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';

import nextId from '../../libs/next-id';
import { sequelize } from '../sequelize';

export default class Deployment extends Model<InferAttributes<Deployment>, InferCreationAttributes<Deployment>> {
  declare id: CreationOptional<string>;

  declare createdBy: string;

  declare updatedBy: string;

  declare projectId: string;

  declare projectRef: string;

  declare agentId: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare access: 'private' | 'public';

  declare categories?: string[];

  static associate(models: { [key: string]: any }) {
    Deployment.belongsToMany(models.Category, {
      through: models.DeploymentCategory,
      foreignKey: 'deploymentId',
      otherKey: 'categoryId',
    });
  }
}

Deployment.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.STRING,
    },
    projectId: {
      type: DataTypes.STRING,
    },
    projectRef: {
      type: DataTypes.STRING,
    },
    agentId: {
      type: DataTypes.STRING,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
    access: {
      type: DataTypes.STRING,
      defaultValue: 'public',
    },
  },
  { sequelize }
);
