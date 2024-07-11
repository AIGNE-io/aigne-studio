import setupHtmlRouter from '@api/routes/html';
// eslint-disable-next-line import/no-extraneous-dependencies
import { setupClient } from 'vite-plugin-blocklet';

import { app, server } from './src';

(async () => {
  const vite = await setupClient(app, {
    server,
    importMetaHot: import.meta.hot,
  });

  setupHtmlRouter(app, vite);
})();
