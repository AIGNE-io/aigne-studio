import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class Project extends Model<InferAttributes<Project>, InferCreationAttributes<Project>> {
  declare _id: string;

  declare name?: CreationOptional<string>;

  declare description?: CreationOptional<string>;

  declare model: string;

  declare createdAt?: CreationOptional<Date>;

  declare updatedAt?: CreationOptional<Date>;

  declare createdBy: CreationOptional<string>;

  declare updatedBy: CreationOptional<string>;

  declare pinnedAt?: CreationOptional<Date>;

  declare icon?: CreationOptional<string>;

  declare gitType?: CreationOptional<'simple' | 'default'>;

  declare temperature?: CreationOptional<number>;

  declare topP?: CreationOptional<number>;

  declare presencePenalty?: CreationOptional<number>;

  declare frequencyPenalty?: CreationOptional<number>;

  declare maxTokens?: CreationOptional<number>;

  public static readonly GENESIS_ATTRIBUTES = {
    _id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
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
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
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
    },
    temperature: {
      type: DataTypes.FLOAT,
    },
    topP: {
      type: DataTypes.FLOAT,
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
  };

  public static initialize(sequelize: any) {
    this.init(Project.GENESIS_ATTRIBUTES, { sequelize });
  }
}
