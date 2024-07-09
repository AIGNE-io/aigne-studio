/* eslint-disable import/no-extraneous-dependencies */

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { createBlockletPlugin } from 'vite-plugin-blocklet';
import tsconfigPaths from 'vite-tsconfig-paths';

const hmrHostName = process.env.__HMR_HOSTNAME__;
const hmrPath = process.env.__HMR_PATH__;

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    optimizeDeps: {
      force: true,
    },
    server: {
      hmr: hmrPath
        ? {
            clientPort: 443,
            path: hmrPath,
          }
        : undefined,
    },
    plugins: [
      tsconfigPaths(),
      react(),
      createBlockletPlugin(),
      hmrHostName
        ? {
            name: 'client-host',
            transform(code, id) {
              if (id.endsWith('dist/client/client.mjs') || id.endsWith('dist/client/env.mjs')) {
                return code.replace('__HMR_HOSTNAME__', JSON.stringify(hmrHostName));
              }

              return code;
            },
          }
        : undefined,
    ],
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  };
});
