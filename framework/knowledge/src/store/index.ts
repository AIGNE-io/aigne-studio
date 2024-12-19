import { Config, StoreConfig } from './config';
import migrate from './migrate';
import { initSequelize } from './sequelize';

export async function initStore(config: StoreConfig) {
  Config.init(config);

  console.log('initStore', config);

  const sequelize = initSequelize();

  console.log('initStore sequelize', sequelize);

  await migrate();

  console.log('initStore sequelize', sequelize);

  return sequelize;
}
