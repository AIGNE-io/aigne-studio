/* eslint-disable import/no-extraneous-dependencies */

import { resolve } from 'path';

import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    optimizeDeps: {
      exclude: ['@aigne/core', '@aigne/runtime', '@aigne/memory', '@aigne-project/chatbot'],
      force: true,
    },
    resolve: {
      alias: {
        crypto: 'node:crypto',
        '@aigne/core': resolve(__dirname, '../../framework/core/src'),
        '@aigne/runtime': resolve(__dirname, '../../framework/runtime/src'),
        '@aigne/memory': resolve(__dirname, '../../framework/memory/src'),
      },
    },
  };
});
