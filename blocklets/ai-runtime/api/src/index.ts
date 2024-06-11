import 'express-async-errors';

import path from 'path';

import { AssistantResponseType } from '@blocklet/ai-runtime/types';
import fallback from '@blocklet/sdk/lib/middlewares/fallback';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv-flow';
import express, { ErrorRequestHandler } from 'express';
import expressWs from 'express-ws';

import { isDevelopment } from './libs/env';
import logger from './libs/logger';
import { initResourceStates } from './libs/resource';
import routes from './routes';

dotenv.config();

const { name, version } = require('../../package.json');

export const app = express();
expressWs(app);

app.set('trust proxy', true);
app.use(cookieParser());
app.use(express.json({ limit: '1 mb' }));
app.use(express.urlencoded({ extended: true, limit: '1 mb' }));
app.use(cors());

const router = express.Router();
router.use('/api', routes);
app.use(router);

if (!isDevelopment) {
  const staticDir = path.resolve(process.env.BLOCKLET_APP_DIR!, 'dist');
  app.use(express.static(staticDir, { maxAge: '30d', index: false }));
  app.use(fallback('index.html', { root: staticDir }));
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

  initResourceStates();
});
