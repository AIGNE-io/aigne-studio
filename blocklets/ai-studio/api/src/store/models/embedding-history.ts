import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class EmbeddingHistory extends Model<
  InferAttributes<EmbeddingHistory>,
  InferCreationAttributes<EmbeddingHistory>
> {
  declare _id: CreationOptional<string>;

  declare targetId: CreationOptional<string>;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare targetVersion: CreationOptional<Date>;

  declare error: CreationOptional<string>;

  public static readonly GENESIS_ATTRIBUTES = {
    _id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    targetId: {
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
    targetVersion: {
      type: DataTypes.DATE,
    },
    error: {
      type: DataTypes.STRING,
    },
  };

  public static initialize(sequelize: any) {
    this.init(EmbeddingHistory.GENESIS_ATTRIBUTES, { sequelize });
  }
}
