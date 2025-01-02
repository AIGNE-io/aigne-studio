import type { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../sequelize';

const idGenerator = new Worker();

export const nextProjectId = () => idGenerator.nextId().toString();

export default class Project extends Model<InferAttributes<Project>, InferCreationAttributes<Project>> {
  declare id: CreationOptional<string>;

  // original project/template/example id
  declare duplicateFrom?: string;

  declare name?: string;

  declare description?: string;

  declare model?: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare createdBy: string;

  declare updatedBy: string;

  declare pinnedAt?: Date;

  declare icon?: string;

  declare gitType?: 'simple' | 'default';

  declare temperature?: number;

  declare topP?: number;

  declare presencePenalty?: number;

  declare frequencyPenalty?: number;

  declare maxTokens?: number;

  declare gitUrl?: string;

  declare gitDefaultBranch: string;

  declare gitAutoSync?: boolean;

  declare gitLastSyncedAt?: Date;

  declare didSpaceAutoSync?: true | false;

  declare didSpaceLastSyncedAt?: Date;

  // @deprecated
  declare projectType?: string;

  declare homePageUrl?: string;

  declare appearance?: {
    primaryColor?: string;
    typography?: {
      fontFamily?: string;
      heading?: {
        fontFamily?: string;
      };
    };
    aigneBannerVisible?: boolean;
  };

  static associate(models: { Deployment: any }) {
    this.hasOne(models.Deployment, { foreignKey: 'projectId' });
  }
}

Project.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextProjectId,
    },
    duplicateFrom: {
      type: DataTypes.STRING,
    },
    name: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.STRING,
    },
    model: {
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
    pinnedAt: {
      type: DataTypes.DATE,
    },
    icon: {
      type: DataTypes.STRING,
    },
    gitType: {
      type: DataTypes.STRING,
      defaultValue: 'simple',
    },
    temperature: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
    },
    topP: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
    },
    presencePenalty: {
      type: DataTypes.FLOAT,
    },
    frequencyPenalty: {
      type: DataTypes.FLOAT,
    },
    maxTokens: {
      type: DataTypes.FLOAT,
    },
    gitUrl: {
      type: DataTypes.STRING,
    },
    gitDefaultBranch: {
      type: DataTypes.STRING,
      defaultValue: 'main',
    },
    gitAutoSync: {
      type: DataTypes.BOOLEAN,
    },
    gitLastSyncedAt: {
      type: DataTypes.DATE,
    },
    didSpaceAutoSync: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    didSpaceLastSyncedAt: {
      type: DataTypes.DATE,
    },
    projectType: {
      type: DataTypes.STRING,
    },
    homePageUrl: {
      type: DataTypes.STRING,
    },
    appearance: {
      type: DataTypes.JSON,
    },
  },
  { sequelize }
);
