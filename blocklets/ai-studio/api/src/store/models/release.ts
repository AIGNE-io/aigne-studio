import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class Release extends Model<InferAttributes<Release>, InferCreationAttributes<Release>> {
  declare id: CreationOptional<string>;

  declare projectId: string;

  declare projectRef: string;

  declare assistantId: string;

  // deprecated: use assistant.release.xxx instead
  declare template?: 'default' | 'blue' | 'red' | 'green';

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare createdBy: string;

  declare updatedBy: string;

  // deprecated: use assistant.release.xxx instead
  declare icon?: string;

  // deprecated: use assistant.release.xxx instead
  declare title?: string;

  // deprecated: use assistant.release.xxx instead
  declare description?: string;

  // deprecated: use assistant.release.xxx instead
  declare openerMessage?: string;

  // deprecated: use assistant.release.xxx instead
  declare withCollection?: boolean;

  declare isActive?: boolean;

  // deprecated: use assistant.release.xxx instead
  declare paymentEnabled?: boolean;

  declare paymentProductId?: string;

  declare paymentLinkId?: string;
}

Release.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    projectRef: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    projectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assistantId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    template: {
      type: DataTypes.STRING,
      defaultValue: 'default',
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
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.STRING,
    },
    icon: {
      type: DataTypes.STRING,
    },
    withCollection: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    paymentEnabled: {
      type: DataTypes.BOOLEAN,
    },
    paymentProductId: {
      type: DataTypes.STRING,
    },
    paymentLinkId: {
      type: DataTypes.STRING,
    },
    openerMessage: {
      type: DataTypes.TEXT,
    },
  },
  { sequelize }
);
