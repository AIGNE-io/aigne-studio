import 'express-async-errors';

import { access, mkdir } from 'fs/promises';
import path from 'path';

import { AssistantResponseType } from '@blocklet/ai-runtime/types';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv-flow';
import type { ErrorRequestHandler } from 'express';
import express from 'express';
import { Errors } from 'isomorphic-git';

import { projectCronManager } from './libs/cron-jobs';
import { csrf } from './libs/csrf';
import { Config, isDevelopment } from './libs/env';
import { NoPermissionError, NoSuchEntryAgentError, NotFoundError } from './libs/error';
import logger, { accessLogMiddleware, registerLoggerToConsole } from './libs/logger';
import { importPackageJson } from './libs/package-json';
import { resourceManager } from './libs/resource';
import { xss } from './libs/xss';
import routes from './routes';
import setupHtmlRouter from './routes/html';
import { getOpenEmbed } from './routes/open-embed';
import { handleYjsWebSocketUpgrade } from './routes/ws';
import { initModels } from './store/models/init-models';

registerLoggerToConsole();

export const app = express();

if (process.env.NODE_ENV === 'development') {
  dotenv.config();
}

const { name, version } = importPackageJson();

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
app.use(xss());
app.use(csrf());
app.use(accessLogMiddleware);
app.get('/.well-known/blocklet/openembed', getOpenEmbed);

app.use('/api', routes);

if (!isDevelopment) {
  const staticDir = path.resolve(Config.appDir, 'dist');
  app.use(express.static(staticDir, { maxAge: '30d', index: false }));
  setupHtmlRouter(app);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(<ErrorRequestHandler>((error, _req, res, _next) => {
  logger.error('handle route error', { error });

  try {
    const status =
      error instanceof Errors.NotFoundError || error instanceof NotFoundError || error instanceof NoSuchEntryAgentError
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

const port = parseInt(process.env.BLOCKLET_PORT!, 10);

export const server = app.listen(port, (err?: any) => {
  if (err) throw err;
  logger.info(`> ${name} v${version} ready on ${port}`);

  resourceManager
    .reload()
    .then(() => {
      logger.info('init resource states success');
    })
    .catch((error) => {
      logger.error('init resource states error', { error });
    });

  if (process.env.AUTO_START_CRON_JOBS === 'true') {
    projectCronManager
      .reloadAllProjectsJobs()
      .then(() => {
        logger.info('reload all projects jobs success');
      })
      .catch((error) => {
        logger.error('reload all projects jobs error', { error });
      });
  }
});

handleYjsWebSocketUpgrade(server);

initModels();
