import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

import nextId from '../../../libs/next-id';
import { sequelize } from '../../sequelize';

export default class Dataset extends Model<InferAttributes<Dataset>, InferCreationAttributes<Dataset>> {
  declare id: CreationOptional<string>;

  declare name?: string;

  declare description?: string;

  declare createdAt: CreationOptional<Date>;

  declare updatedAt: CreationOptional<Date>;

  declare createdBy: string;

  declare updatedBy: string;

  declare documents?: number;

  declare projectId?: string;

  declare resourceBlockletDid?: string;

  declare knowledgeId?: string;

  declare icon?: string;

  static findOneWithDocs(props: { [key: string]: any } = {}) {
    const documentsCountSql = Sequelize.literal(
      '(SELECT COUNT(*) FROM DatasetDocuments WHERE DatasetDocuments.knowledgeId = Dataset.id)'
    );

    const totalSizeSql = Sequelize.literal(
      '(SELECT COALESCE(SUM(size), 0) FROM DatasetDocuments WHERE DatasetDocuments.knowledgeId = Dataset.id)'
    );

    return this.findOne({
      attributes: {
        include: [
          [documentsCountSql, 'docs'],
          [totalSizeSql, 'totalSize'],
        ],
      },
      ...props,
    });
  }
}

Dataset.init(
  {
    id: {
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
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    projectId: {
      type: DataTypes.STRING,
    },
    resourceBlockletDid: {
      type: DataTypes.STRING,
    },
    knowledgeId: {
      type: DataTypes.STRING,
    },
    icon: {
      type: DataTypes.STRING,
    },
  },
  { sequelize }
);
