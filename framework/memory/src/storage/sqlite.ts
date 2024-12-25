import { IStorageManager } from '@aigne/core';

import { migrate } from '../store/migrate';
import History, { EventType, init as initHistory } from '../store/models/history';
import { initSequelize } from '../store/sequelize';

export default class SQLiteManager implements IStorageManager {
  constructor(dbPath: string = '') {
    this.init(dbPath);
  }

  private async init(dbPath: string) {
    const sequelize = initSequelize(dbPath);

    initHistory(sequelize);

    await migrate(sequelize);
  }

  async addHistory({
    memoryId,
    oldMemory,
    newMemory,
    event,
    createdAt = new Date(),
    updatedAt = new Date(),
    isDeleted = false,
  }: {
    memoryId: string;
    oldMemory?: string;
    newMemory?: string;
    event: EventType;
    createdAt?: Date;
    updatedAt?: Date;
    isDeleted?: boolean;
  }) {
    return await History.create({
      memoryId,
      oldMemory,
      newMemory,
      event,
      createdAt,
      updatedAt,
      isDeleted,
    });
  }

  async getHistory(memoryId: string) {
    return await History.findAll({ where: { memoryId }, order: [['updatedAt', 'ASC']] });
  }

  async reset() {
    await History.drop();
    await History.sync();
  }
}
