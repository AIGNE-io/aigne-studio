import 'express-async-errors';
import 'nanoid';

import path from 'path';

import { isAxiosError } from 'axios';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv-flow';
import express, { ErrorRequestHandler } from 'express';
import fallback from 'express-history-api-fallback';
import { Errors } from 'isomorphic-git';

import app from './app';
import logger from './libs/logger';
import routes from './routes';

export { default as app } from './app';

dotenv.config();

const { name, version } = require('../../package.json');

app.set('trust proxy', true);
app.use(cookieParser());
app.use(express.json({ limit: '1 mb' }));
app.use(express.urlencoded({ extended: true, limit: '1 mb' }));
app.use(cors());

app.use('/api', routes);

const isProduction = process.env.NODE_ENV === 'production' || process.env.ABT_NODE_SERVICE_ENV === 'production';

if (isProduction) {
  const staticDir = path.resolve(process.env.BLOCKLET_APP_DIR!, 'dist');
  app.use(express.static(staticDir, { maxAge: '30d', index: false }));
  app.use(fallback('index.html', { root: staticDir }));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(<ErrorRequestHandler>((error, _req, res, _next) => {
  logger.error(error);

  if (error instanceof Errors.NotFoundError) {
    res.status(404).json({ error: { message: 'Not Found' } });
    return;
  }

  if (isAxiosError(error)) {
    const { response } = error;

    if (response) {
      res.status(response.status);
      const type = response.headers['content-type'];
      if (type) res.type(type);
      response.data.pipe(res);
      return;
    }
  }

  res.status(500).json({ error: { message: error.message } });
}));

const port = parseInt(process.env.BLOCKLET_PORT!, 10);

export const server = app.listen(port, (err?: any) => {
  if (err) throw err;
  logger.info(`> ${name} v${version} ready on ${port}`);
});

// (async function test() {
//   const repo = new Repository({
//     root: '/Users/chao/.blocklet-server/data/zNKd7u2hqCbEpKMcQtwecez98abdZpLadvwF/ai-studio/repositories/w3rCdbXORBethEIL',
//     parse: (text) => {
//       const doc = new Doc();
//       const store = syncedStore({ state: {} }, doc);

//       Object.assign(store.state, parse(text));

//       return doc;
//     },
//     stringify: (doc) => {
//       const store = syncedStore({ state: {} }, doc);
//       return stringify(store.state);
//     },
//   });

//   const working = await repo.working({ ref: 'main' });
//   const file = working.file('352363830208102400.yaml')!;
//   const store = syncedStore<{ state: Partial<Template> }>({ state: {} }, file);
//   store.state.name = 'foo';
//   await repo.commit({ ref: 'main', message: 'test 123', author: { name: 'foo' } });
// })();
