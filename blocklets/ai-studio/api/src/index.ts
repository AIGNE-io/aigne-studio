import 'express-async-errors';
import 'nanoid';

import fs from 'fs';
import path from 'path';

import { AssistantResponseType } from '@blocklet/ai-runtime/types';
import createSwaggerRouter from '@blocklet/dataset-sdk/openapi';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv-flow';
import express, { ErrorRequestHandler } from 'express';
import fallback from 'express-history-api-fallback';
import { Errors } from 'isomorphic-git';

import app from './app';
import { Config } from './libs/env';
import logger from './libs/logger';
import initProjectIcons from './libs/project-icons';
import routes from './routes';

export { default as app } from './app';

dotenv.config();

const { name, version } = require('../../package.json');

if (fs.existsSync(Config.uploadDir) === false) {
  fs.mkdirSync(Config.uploadDir, { recursive: true });
}

app.set('trust proxy', true);
app.use(cookieParser());
app.use(express.json({ limit: '1 mb' }));
app.use(express.urlencoded({ extended: true, limit: '1 mb' }));
app.use(cors());

app.use(
  '/',
  createSwaggerRouter('AI-Studio', {
    definition: { openapi: '3.0.0', info: { title: 'AI Studio Dataset Protocol', version: '1.0.0' } },
    apis: [path.join(__dirname, './routes/**/*.*')],
  })
);
app.use('/api', routes);

const isProduction = process.env.NODE_ENV === 'production' || process.env.ABT_NODE_SERVICE_ENV === 'production';

if (isProduction) {
  const staticDir = path.resolve(process.env.BLOCKLET_APP_DIR!, 'dist');
  app.use(express.static(staticDir, { maxAge: '30d', index: false }));
  app.use(fallback('index.html', { root: staticDir }));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(<ErrorRequestHandler>((error, _req, res, _next) => {
  logger.error('handle route error', { error });

  try {
    const status = error instanceof Errors.NotFoundError ? 404 : 500;
    if (!res.headersSent) res.status(status).contentType('json');
    if (res.writable)
      res.write(
        JSON.stringify({ type: AssistantResponseType.ERROR, error: { name: error.name, message: error.message } })
      );
  } catch (error) {
    logger.error('Write error to client error', error);
  } finally {
    res.end();
  }
}));

const port = parseInt(process.env.BLOCKLET_PORT!, 10);

export const server = app.listen(port, (err?: any) => {
  if (err) throw err;
  logger.info(`> ${name} v${version} ready on ${port}`);
  initProjectIcons();
});
