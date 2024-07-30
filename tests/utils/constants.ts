import { join } from 'path';

export const TestConstants = {
  get headless() {
    return process.env.HEADLESS !== 'false';
  },

  get appUrl() {
    const url = process.env.TEST_BLOCKLET_APP_URL;
    if (!url) throw new Error('Missing TEST_BLOCKLET_APP_URL');
    return url;
  },

  authFilePath(user: string) {
    return join(process.cwd(), `.playwright/.auth/${user}.json`);
  },

  didSpaceVCPath(user: string) {
    return join(process.cwd(), `.blocklet-tests/.cache/did-space-vc/${user}.json`);
  },
};
