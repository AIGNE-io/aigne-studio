import { join } from 'path';

/* eslint-disable import/no-extraneous-dependencies */
import replace from '@rollup/plugin-replace';
import react from '@vitejs/plugin-react';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import { defineConfig } from 'vite';
import { createBlockletPlugin } from 'vite-plugin-blocklet';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

const arcblockUxBasePath = process.env.ARCBLOCK_UX_BASE_PATH;
const exclude: string[] = [];
const alias: Record<string, string> = {
  'js-tiktoken': join(__dirname, '../../node_modules/js-tiktoken/dist/index.js'),
  typescript: join(__dirname, '../../node_modules/typescript/lib/typescript.js'),
  '@arcblock/did-connect': '@arcblock/did-connect-react',
};
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
  alias['@arcblock/did-connect-react/lib'] = `${arcblockUxBasePath}/packages/did-connect/src`;
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
export default defineConfig(({ mode }) => {
  const plugins = [
    tsconfigPaths(),
    react(),
    createBlockletPlugin({
      // disableEmbed: true,
      embeds: {
        'open-embed/agent-call': 'src/open-embed/agent-call.ts',
        'open-embed/agent-view': 'src/open-embed/agent-view.tsx',
      },
      embedPlugins: [replace({ 'typeof window': JSON.stringify('object') })],
      embedExternals: ['react', '@arcblock/ux/lib/Locale/context', '@arcblock/did-connect-react/lib/Session'],
      // 并发打包 embed 的数量
      embedBuildConcurrency: 3,
    }),
    svgr(),
  ];

  if (mode === 'development') {
    plugins.push(
      codeInspectorPlugin({
        bundler: 'vite',
      })
    );
  }

  return {
    optimizeDeps: {
      // force: true,
      exclude: [
        // force watch @blocklet/ai-runtime for @blocklet/pages-kit
        '@blocklet/ai-runtime',
        ...exclude,
      ],
    },
    resolve: { alias },
    plugins,
    server: { fs: { allow: [join(__dirname, '../..'), join(__dirname, '../../..', 'pages-kit')] } },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('typescript/lib/typescript.js')) {
              return 'vendor-typescript';
            }
            if (id.includes('@excalidraw/mermaid-to-excalidraw')) {
              return 'vendor-excalidraw-mermaid-to-excalidraw';
            }
            if (id.includes('@excalidraw/excalidraw')) {
              return 'vendor-excalidraw-core';
            }
            if (id.includes('js-tiktoken')) {
              return 'vendor-js-tiktoken';
            }
          },
        },
      },
    },
  };
});
