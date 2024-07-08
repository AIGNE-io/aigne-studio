export const TestConstants = {
  headless: process.env.HEADLESS !== 'false',

  get appUrl() {
    const url = process.env.TEST_BLOCKLET_APP_URL;
    if (!url) throw new Error('Missing TEST_BLOCKLET_APP_URL');
    return url;
  },

  authFilePath(user: string) {
    return `.playwright/.auth/${user}.json`;
  },
};
