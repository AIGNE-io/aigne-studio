/* eslint-disable import/no-extraneous-dependencies */

import { resolve } from 'path';

import replace from '@rollup/plugin-replace';
import react from '@vitejs/plugin-react';
import externalGlobals from 'rollup-plugin-external-globals';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  publicDir: false,
  define: {
    'process.env': {
      NODE_ENV: 'production',
    },
  },
  plugins: [
    tsconfigPaths(),
    react(),
    externalGlobals({ react: 'React' }),
    replace({
      'typeof window': JSON.stringify('object'),
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/open-embed/agent-view.tsx'),
      formats: ['es'],
      fileName: 'agent-view',
    },
    rollupOptions: {
      external: ['react'],
      output: {
        dir: 'public/assets/open-embed',
        inlineDynamicImports: true,
      },
    },
  },
});
