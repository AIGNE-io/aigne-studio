import { resolve } from 'path';

/* eslint-disable import/no-extraneous-dependencies */
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { createBlockletPlugin } from 'vite-plugin-blocklet';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    optimizeDeps: {
      exclude: ['@aigne/core', '@aigne/runtime', '@aigne-project/chatbot'],
    },
    resolve: {
      alias: {
        '@aigne/core': resolve(__dirname, '../../framework/core/src'),
        '@aigne/runtime': resolve(__dirname, '../../framework/runtime/src'),
      },
    },
    plugins: [react(), createBlockletPlugin(), svgr()],
    build: {
      // 禁止 preload 可以解决 js 的请求没有 referer 的问题
      cssCodeSplit: false,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  };
});
