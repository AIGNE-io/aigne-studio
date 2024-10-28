declare var blocklet:
  | {
      prefix: string;
      appId: string;
      appUrl: string;
      appName: string;
      appLogo: string;
      appDescription: string;
      version: string;
      componentMountPoints: { title: string; name: string; did: string; mountPoint: string; status: string }[];
      languages?: { code: string; name: string }[];
      preferences?: {
        [key: string]: any;
      };
    }
  | undefined;
