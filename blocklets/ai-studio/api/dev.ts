import { projectCronManager } from '@api/libs/cron-jobs';
// eslint-disable-next-line import/no-extraneous-dependencies
import { setupClient } from 'vite-plugin-blocklet';

import { app, server } from './src';

setupClient(app, {
  server,
  importMetaHot: import.meta.hot,
});

import.meta.hot?.on('vite:beforeFullReload', () => {
  projectCronManager.destroy();
});
import.meta.hot?.dispose(() => {
  projectCronManager.destroy();
});
