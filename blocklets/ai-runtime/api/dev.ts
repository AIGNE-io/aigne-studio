// eslint-disable-next-line import/no-extraneous-dependencies
import { setupClient } from 'vite-plugin-blocklet';

import { app } from './src';

const hmrPort = process.env.__HMR_PORT__;

setupClient(app, hmrPort ? { port: parseInt(hmrPort, 10), protocol: 'wss' } : undefined);
