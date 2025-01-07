import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import type { ModelStatic, Sequelize } from 'sequelize';

import nextId from '../../../lib/next-id';

export interface VectorHistory extends Model<InferAttributes<VectorHistory>, InferCreationAttributes<VectorHistory>> {
  id: CreationOptional<string>;

  data: any;

  createdAt: CreationOptional<Date>;

  updatedAt: CreationOptional<Date>;
}

export function initVectorHistoryModel(sequelize: Sequelize) {
  return (class VectorHistory extends Model {} as ModelStatic<VectorHistory>).init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        defaultValue: nextId,
      },
      data: {
        type: DataTypes.JSON,
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
    },
    { sequelize }
  );
}
