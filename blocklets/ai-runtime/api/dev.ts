import setupHtmlRouter from '@api/routes/html';
// eslint-disable-next-line import/no-extraneous-dependencies
import { setupClient } from 'vite-plugin-blocklet';

import { app, server } from './src';

(async () => {
  const vite = await setupClient(app, {
    server,
  });

  setupHtmlRouter(app, vite);
})();

if (import.meta.hot) {
  const logger = console;

  const killServer = () => {
    server.close(() => {
      logger.log('server closed');
    });
  };

  import.meta.hot.on('vite:beforeFullReload', () => {
    logger.log('full reload');
    killServer();
  });

  import.meta.hot.dispose(() => {
    logger.log('dispose');
    killServer();
  });
}
