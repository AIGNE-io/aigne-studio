// NOTE: add next line to keep sqlite3 in the bundle
import 'sqlite3';
import 'mariadb';

import { Sequelize } from 'sequelize';

import env from '../../libs/env';
import logger from '../../libs/logger';
import DatasetItems from './dataset-items';
import Datasets from './datasets';
import EmbeddingHistories from './embedding-history';
import Projects from './projects';

const models = {
  Projects,
  DatasetItems,
  Datasets,
  EmbeddingHistories,
};

const url = `sqlite:${env.dataDir}/aistudio.db`;

export const sequelize = new Sequelize(url, {
  logging: env.verbose === false ? false : logger.log,
});

export function initialize() {
  Object.values(models).forEach((model) => {
    model.initialize(sequelize);
  });
}

export default models;
