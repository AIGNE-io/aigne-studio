import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { DataTypes, Model } from 'sequelize';

import nextId from '../../libs/next-id';
import { sequelize } from '../sequelize';

export default class Deployment extends Model<InferAttributes<Deployment>, InferCreationAttributes<Deployment>> {
  declare id: CreationOptional<string>;

  declare projectId: string;

  declare projectRef: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare access: 'private' | 'public';

  declare categories?: { id: string; name: string }[];

  declare createdBy: string;

  declare updatedBy: string;

  declare productHuntUrl?: string;

  declare productHuntBannerUrl?: number;

  declare orderIndex: CreationOptional<number>;

  static associate(models: { Category: any; DeploymentCategory: any; Project: any }) {
    this.belongsToMany(models.Category, {
      through: models.DeploymentCategory,
      foreignKey: 'deploymentId',
      otherKey: 'categoryId',
      as: 'categories',
    });

    this.belongsTo(models.Project, { foreignKey: 'projectId' });
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
    projectId: {
      type: DataTypes.STRING,
    },
    projectRef: {
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
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.STRING,
    },

    productHuntUrl: {
      type: DataTypes.STRING,
    },
    productHuntBannerUrl: {
      type: DataTypes.STRING,
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  { sequelize }
);
