import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import type { Sequelize } from 'sequelize';

import nextId from '../../lib/next-id';

export default class Message extends Model<InferAttributes<Message>, InferCreationAttributes<Message>> {
  declare id: CreationOptional<string>;

  declare message?: Record<string, any>;

  declare metadata?: Record<string, any>;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;
}

export const init = (sequelize: Sequelize) => {
  Message.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        defaultValue: nextId,
      },
      message: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      metadata: {
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
    { sequelize: sequelize }
  );
};
