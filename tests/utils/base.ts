import { test as setup } from '@playwright/test';

type CustomTestFixtures = {
  storageStatePath: string;
  appName: string;
};

const test = setup.extend<CustomTestFixtures>({
  storageStatePath: ['', { option: true }],
  appName: ['', { option: true }],
  page: async ({ page }, use) => {
    const safeUrl = page.url() !== 'about:blank';
    if (safeUrl) {
      const hasSet = ['1', 'true'].includes(await page.evaluate(() => localStorage.getItem('has-set') ?? ''));
      if (!hasSet) {
        await page.evaluate(() => {
          localStorage.setItem('domain-warning-skip', 'true');
          localStorage.setItem('has-set', 'true');
        });
        console.log('2333 localStorage set:', localStorage.getItem('domain-warning-skip'));
      }
      await page.reload();
    }

    await use(page);
  },
});

const customSetup = test.extend({});

export default customSetup;
