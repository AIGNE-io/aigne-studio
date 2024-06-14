import setupHtmlRouter from '@api/routes/html';
// eslint-disable-next-line import/no-extraneous-dependencies
import { setupClient } from 'vite-plugin-blocklet';

import { app } from './src';

(async () => {
  const hmrPort = process.env.__HMR_PORT__;

  const vite = await setupClient(app, {
    appType: 'custom',
    ...(hmrPort ? { port: parseInt(hmrPort, 10), protocol: 'wss' } : undefined),
  });

  setupHtmlRouter(app, vite);
})();
