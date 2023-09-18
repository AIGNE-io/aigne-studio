import { existsSync } from 'fs';

/* eslint-disable import/no-extraneous-dependencies */
import react from '@vitejs/plugin-react';
import { PluginOption, defineConfig } from 'vite';
import { createBlockletPlugin } from 'vite-plugin-blocklet';
import svgr from 'vite-plugin-svgr';

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
export default defineConfig(() => {
  return {
    plugins: [dotPathFixPlugin(), react(), createBlockletPlugin(), svgr()],
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  };
});
