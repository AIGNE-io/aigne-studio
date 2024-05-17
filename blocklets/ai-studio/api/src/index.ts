import 'express-async-errors';
import 'nanoid';

import './polyfills';

import { access, mkdir } from 'fs/promises';
import path from 'path';

import { AssistantResponseType } from '@blocklet/ai-runtime/types';
import { createDatasetAPIRouter } from '@blocklet/dataset-sdk/openapi';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv-flow';
import express, { ErrorRequestHandler } from 'express';
import fallback from 'express-history-api-fallback';
import { Errors } from 'isomorphic-git';

import app from './app';
import jobs from './jobs';
import { Config, isDevelopment } from './libs/env';
import { NoPermissionError } from './libs/error';
import logger from './libs/logger';
import initProjectIcons from './libs/project-icons';
import routes from './routes';

export { default as app } from './app';

dotenv.config();

const { name, version } = require('../../package.json');

async function ensureUploadDirExists() {
  try {
    await access(Config.uploadDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await mkdir(Config.uploadDir, { recursive: true });
    } else {
      throw error;
    }
  }
}
ensureUploadDirExists().catch(console.error);

app.set('trust proxy', true);
app.use(cookieParser());
app.use(express.json({ limit: '1 mb' }));
app.use(express.urlencoded({ extended: true, limit: '1 mb' }));
app.use(cors());

app.use(
  '/',
  createDatasetAPIRouter('AI-Studio', path.join(Config.appDir, 'dataset.yml'), {
    definition: { openapi: '3.0.0', info: { title: 'AI Studio Dataset Protocol', version: '1.0.0' } },
    apis: [path.join(__dirname, './routes/**/*.*')],
  })
);
app.use('/api', routes);

if (!isDevelopment) {
  const staticDir = path.resolve(Config.appDir, 'dist');
  app.use(express.static(staticDir, { maxAge: '30d', index: false }));
  app.use(fallback('index.html', { root: staticDir }));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(<ErrorRequestHandler>((error, _req, res, _next) => {
  logger.error('handle route error', { error });

  try {
    const status = error instanceof Errors.NotFoundError ? 404 : error instanceof NoPermissionError ? 403 : 500;
    if (!res.headersSent) res.status(status).contentType('json');
    if (res.writable)
      res.write(
        JSON.stringify({
          type: AssistantResponseType.ERROR,
          error: { type: error.type, message: error.message },
        })
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
  jobs();
});
