/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare var blocklet: import('@blocklet/sdk').WindowBlocklet | undefined;

declare module '@arcblock/did-connect-react/*';
declare module '@arcblock/ux/*';
