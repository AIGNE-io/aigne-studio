// eslint-disable-next-line import/no-extraneous-dependencies
import { setupClient } from 'vite-plugin-blocklet';

import { app, server } from './src';

setupClient(app, {
  server,
});

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
