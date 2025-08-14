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
      localStorage.setItem('domain-warning-skip', 'true');
      localStorage.setItem('has-set', 'true');
    });

    // 定义点击 Remind Me Later 按钮的函数
    const clickRemindButton = async () => {
      try {
        const remindButton = page.getByRole('button', { name: 'Remind Me Later' });
        if ((await remindButton.count()) > 0) {
          await remindButton.click();
        }
      } catch (error) {
        console.log('Failed to click remind button:', error);
      }
    };

    // 页面加载完成后执行
    page.on('load', async () => {
      await clickRemindButton();
    });

    // 对于 SPA 应用，还需要监听导航事件
    page.on('framenavigated', async (frame) => {
      if (frame === page.mainFrame()) {
        // 等待一小段时间确保页面元素渲染完成
        await page.waitForTimeout(1000);
        await clickRemindButton();
      }
    });

    // 初始页面也执行一次
    await clickRemindButton();
    await use(page);
  },
});

const customSetup = test.extend({});

export default customSetup;
