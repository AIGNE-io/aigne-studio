import 'express-async-errors';

import path from 'path';

import { AssistantResponseType } from '@blocklet/ai-runtime/types';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv-flow';
import express, { ErrorRequestHandler } from 'express';

import initCronJob from './jobs';
import { cronManager } from './libs/cron-jobs';
import { getSourceFileDir } from './libs/ensure-dir';
import { isDevelopment } from './libs/env';
import logger, { accessLogMiddleware, registerLoggerToConsole } from './libs/logger';
import { resourceManager } from './libs/resource';
import { xss } from './libs/xss';
import routes from './routes';
import { attachWalletHandlers } from './routes/auth';
import setupHtmlRouter from './routes/html';

const { setPDFDownloadHeader } = require('@blocklet/uploader-server');

registerLoggerToConsole();

if (process.env.NODE_ENV === 'development') {
  dotenv.config();
}

const { name, version } = require('../../package.json');

export const app = express();

app.set('trust proxy', true);
app.use(cookieParser());

app.use(express.json({ limit: '1 mb' }));
app.use(express.urlencoded({ extended: true, limit: '1 mb' }));
app.use(cors());
app.use(xss());

app.use('/upload/:knowledgeId', (req, res, next) => {
  const { knowledgeId } = req.params;
  const sourceFileDir = getSourceFileDir(knowledgeId);

  // if pdf, set download header
  setPDFDownloadHeader(req, res);

  express.static(sourceFileDir, { maxAge: '365d', immutable: true, index: false })(req, res, next);
});

app.use(accessLogMiddleware);

const router = express.Router();
attachWalletHandlers(router);
router.use('/api', routes);
app.use(router);

if (!isDevelopment) {
  const staticDir = path.resolve(process.env.BLOCKLET_APP_DIR!, 'dist');
  app.use(express.static(staticDir, { maxAge: '30d', index: false }));
  setupHtmlRouter(app);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(<ErrorRequestHandler>((error, _req, res, _next) => {
  logger.error('handle route error', { error });

  try {
    if (!res.headersSent) res.status(500).contentType('json');
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

  initCronJob();

  resourceManager
    .reload()
    .then(() => {
      logger.info('init resource states success');
    })
    .catch((error) => {
      logger.error('init resource states error', { error });
    });

  cronManager
    .reloadAllProjectsJobs()
    .then(() => {
      logger.info('reload all blocklets jobs success');
    })
    .catch((error) => {
      logger.error('reload all blocklets jobs error', { error });
    });
});
