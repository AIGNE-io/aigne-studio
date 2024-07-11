/* eslint-disable import/no-extraneous-dependencies */
import { existsSync } from 'fs';

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

// https://vitejs.dev/config/
export default defineConfig((config) => {
  return {
    optimizeDeps: {
      // force: true,
    },
    plugins: [
      tsconfigPaths(),
      dotPathFixPlugin(),
      config.command === 'build' && million.vite({ auto: true }),
      react(),
      createBlockletPlugin(),
      svgr(),
    ],
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  };
});
