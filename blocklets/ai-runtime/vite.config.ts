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
    resolve: {
      alias: {
        //
        '@arcblock/did-connect': '@arcblock/did-connect-react',
      },
    },
    plugins: [
      tsconfigPaths(),
      react(),
      createBlockletPlugin({
        chunkSizeLimit: 6144,
      }),
    ],
    build: { commonjsOptions: { transformMixedEsModules: true } },
    server: { fs: { allow: [join(__dirname, '../..'), join(__dirname, '../../..', 'pages-kit')] } },
  };
});
