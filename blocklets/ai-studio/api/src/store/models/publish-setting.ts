import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class PublishSetting extends Model<
  InferAttributes<PublishSetting>,
  InferCreationAttributes<PublishSetting>
> {
  declare _id: CreationOptional<string>;

  declare assistantId: string;

  declare projectId: string;

  declare template: 'default' | 'blue' | 'red' | 'green';

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare createdBy: string;

  declare updatedBy: string;

  declare title?: string;

  declare isCollection?: boolean;

  declare isActive?: boolean;

  declare description?: string;

  declare icon?: string;
}

PublishSetting.init(
  {
    _id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    assistantId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    projectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    template: {
      type: DataTypes.STRING,
      defaultValue: 'default',
      allowNull: false,
    },
    title: {
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
    },
    updatedBy: {
      type: DataTypes.STRING,
    },
    isCollection: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    description: {
      type: DataTypes.STRING,
    },
    icon: {
      type: DataTypes.STRING,
    },
  },
  { sequelize }
);
