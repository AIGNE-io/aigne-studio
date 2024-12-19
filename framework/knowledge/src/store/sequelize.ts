// NOTE: add next line to keep sqlite3 in the bundle
import 'sqlite3';

import { Sequelize } from 'sequelize';

import logger from '../logger';
import { Config } from './config';

let _sequelize: Sequelize;

export function initSequelize() {
  if (!_sequelize) {
    const config = Config.instance;
    _sequelize = new Sequelize(config.url, { logging: (sql) => logger.debug(sql) });

    _sequelize.query('pragma journal_mode = WAL;');
    _sequelize.query('pragma synchronous = normal;');
    _sequelize.query('pragma journal_size_limit = 67108864;');
  }

  return _sequelize;
}

export function getSequelize() {
  if (!_sequelize) {
    throw new Error('Sequelize not initialized');
  }

  return _sequelize;
}

export const sequelize = getSequelize();
