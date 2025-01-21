import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { DataTypes, Model } from 'sequelize';

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

  declare createdBy: string;

  declare updatedBy: string;
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
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.STRING,
    },
  },
  { sequelize }
);
