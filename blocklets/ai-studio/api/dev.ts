// eslint-disable-next-line import/no-extraneous-dependencies
import { setupClient } from 'vite-plugin-blocklet';

import { app, server } from './src';

setupClient(app, {
  port: Number(process.env.BLOCKLET_VITE_PORT),
  host: '127.0.0.1',
  protocol: 'ws',
});

if (import.meta.hot) {
  console.log('hot reload');
  // eslint-disable-next-line no-inner-declarations
  async function killServer() {
    await server.close((err) => {
      console.log('server closed');
      // process.exit(err ? 1 : 0);
    });
  }

  import.meta.hot.on('vite:beforeFullReload', async () => {
    console.log('full reload');
    await killServer();
  });

  import.meta.hot.dispose(async () => {
    console.log('dispose');
    await killServer();
  });
}
