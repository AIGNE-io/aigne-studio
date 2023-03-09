declare var blocklet:
  | {
      prefix: string;
      appId: string;
      appName: string;
      appLogo: string;
      appDescription: string;
      version: string;
    }
  | undefined;

declare module '@arcblock/ux/*';
declare module '@arcblock/did-connect/*';
declare module '@blocklet/ui-react/*';

declare module 'circular-natal-horoscope-js/dist' {
  export { Horoscope, Origin } from 'circular-natal-horoscope-js';
}
