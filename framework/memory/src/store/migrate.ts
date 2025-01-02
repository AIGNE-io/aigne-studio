import path from 'path';

import type { Sequelize } from 'sequelize';
import { SequelizeStorage, Umzug } from 'umzug';

export const migrate = async (sequelize: Sequelize) => {
  const umzug = new Umzug({
    migrations: {
      glob: ['**/migrations/*.{ts,js}', { cwd: path.join(__dirname, './') }],
      resolve: ({ name, path, context }) => {
        return {
          name,
          up: async () => (await import(path!)).up({ context }),
          down: async () => (await import(path!)).down({ context }),
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
  });

  try {
    await umzug.up();
  } catch (error) {
    console.error('Failed to migrate', error);
    throw error;
  }
};
