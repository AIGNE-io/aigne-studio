import { DataTypes } from 'sequelize';

import Content, { init as initContent } from '../store/models/content';
import { initSequelize } from '../store/sequelize';

export default class SQLiteContentManager {
  static async load(dbPath: string) {
    const instance = new SQLiteContentManager();
    await instance.init(dbPath);
    return instance;
  }

  private async init(dbPath: string) {
    const sequelize = initSequelize(dbPath);

    initContent(sequelize);

    const tables = await sequelize.getQueryInterface().showAllTables();
    if (!tables.includes('Contents')) {
      await sequelize.getQueryInterface().createTable('Contents', {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
          allowNull: false,
        },
        pageContent: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.DATE,
        },
        updatedAt: {
          type: DataTypes.DATE,
        },
      });
    }
  }

  async addOriginContent(id: string, content: string, metadata: { [key: string]: any }) {
    return await Content.create({ id, pageContent: content, metadata });
  }

  async updateOriginContent(id: string, content: string, metadata: { [key: string]: any }) {
    return await Content.update({ pageContent: content, metadata }, { where: { id } });
  }

  async deleteOriginContent(id: string) {
    return await Content.destroy({ where: { id } });
  }

  async getOriginContent(where: { [key: string]: any }): Promise<Content[]> {
    return await Content.findAll({ where });
  }

  async getOriginContentById(id: string): Promise<Content | null> {
    return await Content.findOne({ where: { id } });
  }
}
