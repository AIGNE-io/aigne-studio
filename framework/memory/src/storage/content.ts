import { VectorStoreDocument } from '../core/type';
import { migrate } from '../store/migrate';
import VectorHistory, { init as initContent } from '../store/models/content';
import { initSequelize } from '../store/sequelize';

export default class DefaultVectorHistoryStore {
  constructor(public path: string) {}

  private _init?: Promise<void>;

  private async init() {
    this._init ??= (async () => {
      const dbPath = `sqlite:${this.path}/default-vector-history.db`;

      const sequelize = initSequelize(dbPath);

      // FIXME: 多实例会导致 sequelize 冲突，把 A memory 的数据存储到 B memory 的数据库中
      initContent(sequelize);

      // TODO: 分割 models 中的各个数据库，每个数据库应该有自己的 migration
      await migrate(sequelize);
    })();

    await this._init;
  }

  async add(data: VectorStoreDocument<any>) {
    await this.init();

    return await VectorHistory.create({ id: data.id, data });
  }

  async update(data: VectorStoreDocument<any>) {
    return await VectorHistory.update({ data }, { where: { id: data.id } });
  }

  async delete(id: string) {
    return await VectorHistory.destroy({ where: { id } });
  }

  async findAll(where: { [key: string]: any }): Promise<VectorHistory[]> {
    return await VectorHistory.findAll({ where });
  }
}
