import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import type { Sequelize } from 'sequelize';

import { EventType } from '../../core/type';
import nextId from '../../lib/next-id';

export default class History extends Model<InferAttributes<History>, InferCreationAttributes<History>> {
  declare id: CreationOptional<string>;

  declare memoryId: string;

  declare oldMemory?: any;

  declare newMemory?: any;

  declare event: EventType;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare isDeleted?: boolean;
}

export const init = (sequelize: Sequelize) => {
  History.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        defaultValue: nextId,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      memoryId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      oldMemory: {
        type: DataTypes.JSON,
      },
      newMemory: {
        type: DataTypes.JSON,
      },
      event: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    { sequelize }
  );
};
