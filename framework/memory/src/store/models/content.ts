import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import type { Sequelize } from 'sequelize';

import nextId from '../../lib/next-id';

export default class VectorHistory extends Model<
  InferAttributes<VectorHistory>,
  InferCreationAttributes<VectorHistory>
> {
  declare id: CreationOptional<string>;

  declare data: any;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;
}

export const init = (sequelize: Sequelize) => {
  VectorHistory.init(
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
      },
      updatedAt: {
        type: DataTypes.DATE,
      },
    },
    { sequelize }
  );
};
