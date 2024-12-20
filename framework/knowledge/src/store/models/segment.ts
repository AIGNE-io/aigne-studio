import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';

import nextId from '../../libs/next-id';
import { getSequelize } from '../sequelize';

export default class KnowledgeSegment extends Model<
  InferAttributes<KnowledgeSegment>,
  InferCreationAttributes<KnowledgeSegment>
> {
  declare id: CreationOptional<string>;

  declare documentId: string;

  declare content?: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;
}

export const init = () => {
  KnowledgeSegment.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        defaultValue: nextId,
      },
      documentId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
      },
      createdAt: {
        type: DataTypes.DATE,
      },
      updatedAt: {
        type: DataTypes.DATE,
      },
    },
    { sequelize: getSequelize() }
  );
};
