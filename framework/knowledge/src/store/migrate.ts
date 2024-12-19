import type { ColumnsDescription, QueryInterface } from 'sequelize';
import { SequelizeStorage, Umzug } from 'umzug';

import { getSequelize } from './sequelize';

export const migrate = async () => {
  const sequelize = getSequelize();

  const umzug = new Umzug({
    migrations: {
      glob: ['**/migrations/*.{ts,js}', { cwd: __dirname }],
      resolve: ({ name, path, context }) => ({
        name,
        up: async () => (await import(path!)).up({ context }),
        down: async () => (await import(path!)).down({ context }),
      }),
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
  });

  await umzug.up();
};

export async function existsColumn(context: QueryInterface, tableName: string, columnName: string) {
  const columnsDescription: ColumnsDescription = await context.describeTable(tableName);
  return columnName in columnsDescription;
}
