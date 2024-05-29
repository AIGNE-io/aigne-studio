import { existsSync } from 'fs';
/* eslint-disable import/no-extraneous-dependencies */
import path from 'path';

import buildOpenAPIPlugin from '@blocklet/dataset-sdk/plugin';
import react from '@vitejs/plugin-react';
import million from 'million/compiler';
import { PluginOption, defineConfig } from 'vite';
import { createBlockletPlugin } from 'vite-plugin-blocklet';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

// NOTE: 我们项目中有一些页面路径是以 .yaml 结尾的，vite 默认不支持这样的路径（会返回 404）
const dotPathFixPlugin: () => PluginOption = () => ({
  name: 'dot-path-fix-plugin',
  configureServer: (server) => {
    server.middlewares.use((req, _, next) => {
      const reqPath = req.url?.split('?', 2)[0];
      if (
        !req.url?.startsWith('/@') && // virtual files provided by vite plugins
        !req.url?.startsWith('/api/') && // api proxy, configured below
        !existsSync(`./public${reqPath}`) && // files served directly from public folder
        !existsSync(`.${reqPath}`) // actual files
      ) {
        req.url = '/';
      }
      next();
    });
  },
});

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
      dotPathFixPlugin(),
      million.vite({ auto: true }),
      react(),
      createBlockletPlugin(),
      buildOpenAPIPlugin({ apis: [path.join(__dirname, './api/src/routes/**/*.*')] }),
      svgr(),
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
