import 'sqlite3';

import { Sequelize } from 'sequelize';

import logger from '../logger';

export function initSequelize(path: string) {
  const _sequelize = new Sequelize(path, { logging: (sql) => logger.debug(sql) });

  _sequelize.query('pragma journal_mode = WAL;');
  _sequelize.query('pragma synchronous = normal;');
  _sequelize.query('pragma journal_size_limit = 67108864;');

  return _sequelize;
}
