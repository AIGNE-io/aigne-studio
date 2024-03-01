import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Worker } from 'snowflake-uuid';

import { sequelize } from '../../sequelize';

const idGenerator = new Worker();

const nextId = () => idGenerator.nextId().toString();

export default class Segment extends Model<InferAttributes<Segment>, InferCreationAttributes<Segment>> {
  declare id: CreationOptional<string>;

  declare unitId: string;

  declare content?: string;

  declare index?: number;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;
}

Segment.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      defaultValue: nextId,
    },
    unitId: {
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

Segment.beforeCreate(async (segment) => {
  if (!segment.index) {
    const maxIndex: number = await Segment.max('index', { where: { unitId: segment.unitId } });
    segment.index = maxIndex ? maxIndex + 1 : 1;
  }
});
