import { Config, StoreConfig } from './config';
import migrate from './migrate';
import { initSequelize } from './sequelize';

export async function initStore(config: StoreConfig) {
  Config.init(config);

  const sequelize = initSequelize();

  await migrate();

  return sequelize;
}
