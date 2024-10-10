import { join } from 'path';

export const TestConstants = {
  get headless() {
    return process.env.HEADLESS !== 'false';
  },

  authFilePath(user: string) {
    return join(process.cwd(), '.playwright/.auth/', `${user}.json`);
  },

  didSpaceVCPath(user: string) {
    return join(process.cwd(), '.blocklet-tests/.cache/did-space-vc/', `${user}.json`);
  },
};
