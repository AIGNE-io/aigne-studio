import { join } from 'path';

/* eslint-disable import/no-extraneous-dependencies */
import replace from '@rollup/plugin-replace';
import react from '@vitejs/plugin-react';
import million from 'million/compiler';
import { defineConfig } from 'vite';
import { createBlockletPlugin } from 'vite-plugin-blocklet';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig((config) => {
  return {
    optimizeDeps: {
      // force: true,
      exclude: [
        // force watch @blocklet/ai-runtime for @blocklet/pages-kit
        '@blocklet/ai-runtime',
      ],
    },
    plugins: [
      tsconfigPaths(),
      config.command === 'build' && million.vite({ auto: true }),
      react(),
      createBlockletPlugin({
        // disableEmbed: true,
        embeds: {
          'open-embed/agent-view': 'src/open-embed/agent-view.tsx',
          'open-embed/agent-call': 'src/open-embed/agent-call.ts',
        },
        embedPlugins: [
          replace({
            'typeof window': JSON.stringify('object'),
          }),
        ],
        embedExternals: ['react', '@arcblock/ux/lib/Locale/context', '@arcblock/did-connect/lib/Session'],
        // 并发打包 embed 的数量
        embedBuildConcurrency: 3,
      }),
      svgr(),
    ],
    server: {
      fs: {
        allow: [join(__dirname, '../..'), join(__dirname, '../../..', 'pages-kit')],
      },
    },
  };
});
