import { test as setup } from '@playwright/test';

type CustomTestFixtures = {
  storageStatePath: string;
  appName: string;
};

const test = setup.extend<CustomTestFixtures>({
  storageStatePath: ['', { option: true }],
  appName: ['', { option: true }],
  page: async ({ page }, use) => {
    // 初始设置
    await page.addInitScript(() => {
      try {
        localStorage.setItem('domain-warning-skip', 'true');
        localStorage.setItem('has-set', 'true');
      } catch (error) {
        console.warn('Failed to set localStorage:', error);
      }
    });

    // 定义点击 Remind Me Later 按钮的函数
    const clickRemindButton = async () => {
      try {
        const remindButton = page.getByRole('button', { name: 'Remind Me Later' });
        if ((await remindButton.count()) > 0) {
          await remindButton.click({ timeout: 3000 });
        }
      } catch (error) {
        console.warn('Failed to click remind button:', error);
      }
    };

    await clickRemindButton();
    await use(page);
  },
});

const customSetup = test.extend({});

export default customSetup;
