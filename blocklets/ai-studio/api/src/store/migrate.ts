import { SequelizeStorage, Umzug } from 'umzug';

import { sequelize } from './models';

const umzug = new Umzug({
  migrations: {
    glob: ['migrations/*.{ts,js}', { cwd: __dirname }],
    resolve: ({ name, path, context }) => {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const migration = require(path!);
      return {
        name: name.replace(/\.ts$/, '.js'),
        up: () => migration.up({ context }),
        down: () => migration.down({ context }),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

export default async function migrate() {
  await umzug.up();
}

export type Migration = typeof umzug._types.migration;
