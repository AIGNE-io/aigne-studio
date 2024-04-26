declare var blocklet:
  | {
      prefix: string;
      appId: string;
      appUrl: string;
      appName: string;
      appLogo: string;
      appDescription: string;
      version: string;
      componentMountPoints: { title: string; name: string; did: string; mountPoint: string }[];
      languages?: { code: string; name: string }[];
    }
  | undefined;
