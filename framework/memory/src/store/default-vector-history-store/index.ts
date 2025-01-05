import { VectorStoreDocument } from '../../core/type';
import { initSequelize } from '../../lib/sequelize';
import { migrate } from './migrate';
import { initVectorHistoryModel } from './models/vector-history';

export class DefaultVectorHistoryStore {
  constructor(public path: string) {}

  private _models?: Promise<{ VectorHistory: ReturnType<typeof initVectorHistoryModel> }>;

  private get models() {
    this._models ??= (async () => {
      const dbPath = `sqlite:${this.path}/default-vector-history.db`;

      const sequelize = initSequelize(dbPath);

      await migrate(sequelize);

      return { VectorHistory: initVectorHistoryModel(sequelize) };
    })();

    return this._models;
  }

  async add(data: VectorStoreDocument<any>) {
    const { VectorHistory } = await this.models;

    return await VectorHistory.create({ id: data.id, data });
  }

  async update(data: VectorStoreDocument<any>) {
    const { VectorHistory } = await this.models;

    return await VectorHistory.update({ data }, { where: { id: data.id } });
  }

  async delete(id: string) {
    const { VectorHistory } = await this.models;

    return await VectorHistory.destroy({ where: { id } });
  }

  async findAll(where: { [key: string]: any }): Promise<VectorStoreDocument<any>[]> {
    const { VectorHistory } = await this.models;

    return (await VectorHistory.findAll({ where })).map((i) => i.data);
  }

  async reset() {
    const { VectorHistory } = await this.models;

    await VectorHistory.sequelize?.truncate();
  }
}
