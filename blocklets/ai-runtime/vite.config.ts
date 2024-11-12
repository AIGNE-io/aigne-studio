/* eslint-disable import/no-extraneous-dependencies */

import { join } from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { createBlockletPlugin } from 'vite-plugin-blocklet';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    optimizeDeps: {
      // force: true,
    },
    plugins: [tsconfigPaths(), react(), createBlockletPlugin()],
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      chunkSizeWarningLimit: 5000,
    },
    server: {
      fs: {
        allow: [join(__dirname, '../..'), join(__dirname, '../../..', 'pages-kit')],
      },
    },
  };
});
