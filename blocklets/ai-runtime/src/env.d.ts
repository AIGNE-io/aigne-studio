/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare var blocklet:
  | {
      prefix: string;
      appId: string;
      appName: string;
      appDescription: string;
      componentId: string;
      componentMountPoints: {
        title: string;
        name: string;
        did: string;
        mountPoint: string;
      }[];
      languages?: { code: string; name: string }[];
    }
  | undefined;

declare module '@arcblock/did-connect/*';
declare module '@arcblock/ux/*';
declare module 'express-xss-sanitizer';
