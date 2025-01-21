import { join } from 'path';

/* eslint-disable import/no-extraneous-dependencies */
import replace from '@rollup/plugin-replace';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { createBlockletPlugin } from 'vite-plugin-blocklet';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

const isDev = process.env.NODE_ENV === 'development';
const arcblockUxBasePath = process.env.ARCBLOCK_UX_BASE_PATH;
const exclude: string[] = [];
const alias: Record<string, string> = {};
const excludeLibs: string[] = [
  // 排除 ux repo 中其他的包
  '@arcblock/bridge',
  '@arcblock/icons',
  '@arcblock/react-hooks',
  '@arcblock/nft-display',
  // 排除 ux repo 中 使用到 server repo 的包
  '@blocklet/meta',
  '@blocklet/js-sdk',
  // 排除带有公共 context 的包
  'react',
  'react-router-dom',
  '@emotion/react',
  '@emotion/styled',
  '@mui/icons-material',
  '@mui/material',
  'flat',
];
if (arcblockUxBasePath) {
  alias['@arcblock/ux/lib'] = `${arcblockUxBasePath}/packages/ux/src`;
  alias['@arcblock/did-connect/lib'] = `${arcblockUxBasePath}/packages/did-connect/src`;
  alias['@blocklet/ui-react/lib'] = `${arcblockUxBasePath}/packages/blocklet-ui-react/src`;
  alias['@blocklet/ui-react'] = `${arcblockUxBasePath}/packages/blocklet-ui-react`;

  excludeLibs.forEach((x) => {
    alias[x] = join(process.cwd(), `../../node_modules/${x}`);
  });

  alias.dayjs = join(process.cwd(), '../../node_modules/dayjs/esm/');

  exclude.push('@blocklet/did-space-react');
  exclude.push('@blocklet/ui-react');
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    optimizeDeps: {
      // force: true,
      exclude: [
        // force watch @blocklet/ai-runtime for @blocklet/pages-kit
        '@blocklet/ai-runtime',
        ...exclude,
      ],
    },
    resolve: {
      alias,
    },
    plugins: [
      tsconfigPaths(),
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
        embedBuildConcurrency: 1,
      }),
      svgr(),
    ],
    server: {
      fs: {
        allow: [join(__dirname, '../..'), join(__dirname, '../../..', 'pages-kit')],
      },
      // 添加目标主机到 allowedHosts
      ...(isDev ? { allowedHosts: true } : {}),
    },
  };
});
