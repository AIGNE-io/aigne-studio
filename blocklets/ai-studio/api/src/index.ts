import 'express-async-errors';
import 'nanoid';

import './polyfills';

import { access, mkdir } from 'fs/promises';
import path from 'path';

import { AssistantResponseType } from '@blocklet/ai-runtime/types';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv-flow';
import express, { ErrorRequestHandler } from 'express';
import fallback from 'express-history-api-fallback';
import { Errors } from 'isomorphic-git';

import { name, version } from '../../package.json';
import app from './app';
import { Config, isDevelopment } from './libs/env';
import { NoPermissionError, NotFoundError } from './libs/error';
import logger from './libs/logger';
import { initResourceStates } from './libs/resource';
import routes from './routes';

export { default as app } from './app';

dotenv.config();

app.use('/api/data', (req, res) => {
  res.json({ data: 'hello you' });
});

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

app.use('/api', routes);

if (!process.env.VITE) {
  if (!isDevelopment) {
    const staticDir = path.resolve(Config.appDir, 'dist');
    app.use(express.static(staticDir, { maxAge: '30d', index: false }));
    app.use(fallback('index.html', { root: staticDir }));
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(<ErrorRequestHandler>((error, _req, res, _next) => {
  logger.error('handle route error', { error });

  try {
    const status =
      error instanceof Errors.NotFoundError || error instanceof NotFoundError
        ? 404
        : error instanceof NoPermissionError
          ? 403
          : 500;
    if (!res.headersSent) res.status(status).contentType('json');
    if (res.writable)
      res.write(
        JSON.stringify({
          type: AssistantResponseType.ERROR,
          error: { type: error.type, name: error.name, message: error.message },
        })
      );
  } catch (error) {
    logger.error('Write error to client error', error);
  } finally {
    res.end();
  }
}));

if (!process.env.VITE) {
  const port = parseInt(process.env.BLOCKLET_PORT!, 10);

  app.listen(port, (err?: any) => {
    if (err) throw err;
    logger.info(`> ${name} v${version} ready on ${port}`);

    initResourceStates();
  });
}
