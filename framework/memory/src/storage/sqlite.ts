import { IStorageManager } from '@aigne/core';

import { migrate } from '../store/migrate';
import History, { EventType, init as initHistory } from '../store/models/history';
import Message, { init as initMessage } from '../store/models/message';
import { initSequelize } from '../store/sequelize';

export default class SQLiteManager implements IStorageManager {
  static async load(dbPath: string) {
    const instance = new SQLiteManager();
    await instance.init(dbPath);
    return instance;
  }

  async init(dbPath: string) {
    const sequelize = initSequelize(dbPath);

    initHistory(sequelize);
    initMessage(sequelize);

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

  async addMessage(message: { [key: string]: any }, metadata: { [key: string]: any }) {
    return await Message.create({ message, metadata });
  }

  async getMessage(id: string) {
    return await Message.findByPk(id);
  }

  async getMessages(props: { [key: string]: any }) {
    return await Message.findAll({ where: props });
  }

  async reset() {
    await History.sync();
  }
}
