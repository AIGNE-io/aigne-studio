import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import type { Sequelize } from 'sequelize';

import nextId from '../../lib/next-id';
import { EventType } from '../../types/memory';

export default class History extends Model<InferAttributes<History>, InferCreationAttributes<History>> {
  declare id: CreationOptional<string>;

  declare memoryId: string;

  declare oldMemory?: string;

  declare newMemory?: string;

  declare newValue?: string;

  declare event: EventType;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare isDeleted: boolean;
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
      memoryId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      oldMemory: {
        type: DataTypes.TEXT,
      },
      newMemory: {
        type: DataTypes.TEXT,
      },
      newValue: {
        type: DataTypes.TEXT,
      },
      event: {
        type: DataTypes.TEXT,
      },
      createdAt: {
        type: DataTypes.DATE,
      },
      updatedAt: {
        type: DataTypes.DATE,
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    { sequelize }
  );
};
