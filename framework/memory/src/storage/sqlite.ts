import { LRUCache } from 'lru-cache';

import { ActionHistory, EventType, HistoryStore, MessageHistory } from '../core/type';
import { migrate } from '../store/migrate';
import { init as initContent } from '../store/models/content';
import History, { init as initHistory } from '../store/models/history';
import Message, { init as initMessage } from '../store/models/message';
import { initSequelize } from '../store/sequelize';

const cache = new LRUCache<string, DefaultHistoryStore<any>>({
  max: Number(process.env.AIGNE_MEMORY_SQLITE_STORE_CACHE_MAX) || 500,
  ttl: Number(process.env.AIGNE_MEMORY_SQLITE_STORE_CACHE_TTL) || 60e3,
});

export default class DefaultHistoryStore<T> implements HistoryStore<T> {
  static load<T>({ path }: { path: string }): DefaultHistoryStore<T> {
    let store = cache.get(path);
    if (!store) {
      store = new DefaultHistoryStore<T>(path);
      cache.set(path, store);
    }
    return store as DefaultHistoryStore<T>;
  }

  constructor(public path: string) {}

  private _init?: Promise<void>;

  private async init() {
    this._init ??= (async () => {
      const dbPath = `sqlite:${this.path}/default-history-store.db`;

      const sequelize = initSequelize(dbPath);

      // FIXME: 多实例会导致 sequelize 冲突，把 A memory 的数据存储到 B memory 的数据库中
      initHistory(sequelize);
      initMessage(sequelize);
      initContent(sequelize);

      await migrate(sequelize);
    })();

    await this._init;
  }

  async addHistory(history: ActionHistory<T>): Promise<ActionHistory<T>> {
    await this.init();

    return await History.create(history);
  }

  async getHistory(memoryId: string): Promise<ActionHistory<T>[]> {
    await this.init();

    return await History.findAll({ where: { memoryId }, order: [['updatedAt', 'ASC']] });
  }

  async addMessage(history: Omit<MessageHistory, 'createdAt' | 'updatedAt'>): Promise<MessageHistory> {
    await this.init();

    return await Message.create(history);
  }

  async getMessage(id: string) {
    await this.init();

    return await Message.findByPk(id);
  }

  async getMessages(options: { filter: { [key: string]: any } }): Promise<MessageHistory[]> {
    await this.init();

    return await Message.findAll({ where: options.filter });
  }
}
