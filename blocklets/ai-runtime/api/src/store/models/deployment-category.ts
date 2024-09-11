import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';

import nextId from '../../libs/next-id';
import { sequelize } from '../sequelize';

export default class DeploymentCategory extends Model<
  InferAttributes<DeploymentCategory>,
  InferCreationAttributes<DeploymentCategory>
> {
  declare id: string;

  declare deploymentId: string;

  declare categoryId: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  static associate(models: { [key: string]: any }) {
    DeploymentCategory.belongsTo(models.Deployment, {
      foreignKey: 'deploymentId',
    });

    DeploymentCategory.belongsTo(models.Category, {
      foreignKey: 'categoryId',
    });
  }
}

DeploymentCategory.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    deploymentId: {
      type: DataTypes.STRING,
    },
    categoryId: {
      type: DataTypes.STRING,
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
