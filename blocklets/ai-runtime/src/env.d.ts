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
