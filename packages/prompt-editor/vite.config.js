/* eslint-disable import/no-extraneous-dependencies */
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), svgr()],
    build: {
      chunkSizeWarningLimit: 2000,
    },
  };
});
