import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class NewDatasetSegment extends Model<
  InferAttributes<NewDatasetSegment>,
  InferCreationAttributes<NewDatasetSegment>
> {
  declare id: CreationOptional<string>;

  declare documentId: string;

  declare content?: string;

  declare index?: number;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;
}

NewDatasetSegment.init(
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
      type: DataTypes.STRING,
    },
    index: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
  },
  { sequelize }
);

NewDatasetSegment.beforeCreate(async (segment) => {
  if (!segment.index) {
    const maxIndex: number = await NewDatasetSegment.max('index', { where: { documentId: segment.documentId } });
    segment.index = maxIndex ? maxIndex + 1 : 1;
  }
});
