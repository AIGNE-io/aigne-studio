import { setupClient } from 'vite-plugin-blocklet';

import { app, server } from './src';

(async () => {
  await setupClient(app, {
    server,
    importMetaHot: import.meta.hot,
  });
})();
