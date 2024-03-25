// / <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '@arcblock/ux/*';
declare module '@arcblock/did-connect/*';
declare module '@blocklet/ui-react/*';
declare module '@blocklet/discuss-kit';

declare module 'circular-natal-horoscope-js/dist' {
  export { Horoscope, Origin } from 'circular-natal-horoscope-js';
}

declare var blocklet: import('@blocklet/sdk').WindowBlocklet & {
  /**
   * @example zNKhZCE3RSaC4UDpB3dR1CxD3vpGkawEkStz/z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB
   * @description
   * @type {string}
   */
  componentId: string;
};
