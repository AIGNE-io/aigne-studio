import { MemoryMessage, MemoryMetadata } from '@aigne/core';
import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import type { Sequelize } from 'sequelize';

import nextId from '../../lib/next-id';

export default class Message extends Model<InferAttributes<Message>, InferCreationAttributes<Message>> {
  declare id: CreationOptional<string>;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare userId?: string;

  declare sessionId?: string;

  declare messages: MemoryMessage[];

  declare metadata: MemoryMetadata;
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
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      userId: {
        type: DataTypes.STRING,
      },
      sessionId: {
        type: DataTypes.STRING,
      },
      messages: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: false,
      },
    },
    { sequelize }
  );
};
