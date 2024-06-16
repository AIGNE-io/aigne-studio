import { join } from 'path';

import { Config, isDevelopment } from '@api/libs/env';
import type { ColumnsDescription, QueryInterface } from 'sequelize';
import { SequelizeStorage, Umzug } from 'umzug';

import { sequelize } from './sequelize';

const umzug = new Umzug({
  migrations: {
    glob: ['**/migrations/*.{ts,js}', { cwd: isDevelopment ? __dirname : join(Config.appDir, 'api/dist/store') }],
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

export async function existsColumn(context: QueryInterface, tableName: string, columnName: string) {
  const columnsDescription: ColumnsDescription = await context.describeTable(tableName);
  return columnName in columnsDescription;
}

export type Migration = typeof umzug._types.migration;
