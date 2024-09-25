import { projectCronManager } from '@api/libs/cron-jobs';
import setupHtmlRouter from '@api/routes/html';
// eslint-disable-next-line import/no-extraneous-dependencies
import { setupClient } from 'vite-plugin-blocklet';

import { app, server } from './src';

(async () => {
  const vite = await setupClient(app, {
    appType: 'custom',
    server,
    importMetaHot: import.meta.hot,
  });

  setupHtmlRouter(app, vite);
})();

import.meta.hot?.on('vite:beforeFullReload', () => {
  projectCronManager.destroy();
});
import.meta.hot?.dispose(() => {
  projectCronManager.destroy();
});
