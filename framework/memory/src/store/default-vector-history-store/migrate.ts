import type { Sequelize } from 'sequelize';
import { SequelizeStorage, Umzug } from 'umzug';

import * as init from './migrations/20250104110401-init';

export const migrate = async (sequelize: Sequelize) => {
  const umzug = new Umzug({
    migrations: [{ ...init, name: '20250104110401-init' }],
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
  });

  await umzug.up();
};
