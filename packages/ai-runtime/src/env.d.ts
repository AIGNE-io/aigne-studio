declare module '@arcblock/ux/*';

declare module '@blocklet/logger' {
  export default function createLogger(name: string): typeof console;
}

declare module '@arcblock/did-connect-react/*';
