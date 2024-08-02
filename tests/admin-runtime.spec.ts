import { Page, expect, test } from '@playwright/test';

import { installBlocklet, unInstallBlocklet } from './utils/uninstall';

test.beforeEach('route to blocklets', async ({ page }) => {
  await page.goto('.well-known/service/admin/overview');
  await page.waitForSelector('h6.page-title');
  await page.locator("button span:has-text('Blocklets')").click();
  await page.waitForSelector('button:has-text("Add Blocklet")');
});

test.describe.serial('resource blocklet', () => {
  test('init', async ({ page }) => {
    test.slow();
    await page.goto('/projects');
    await page.getByLabel('User info button').click();
    await page.getByRole('menuitem', { name: 'Dashboard' }).click();
    await page.locator('h6.page-title').waitFor();
    await page.locator("button span:has-text('Blocklets')").click();
    await page.locator('button:has-text("Add Blocklet")').waitFor();

    await unInstallBlocklet(page, 'Mockplexity');
    await unInstallBlocklet(page, 'SerpApi');

    await installBlocklet(page);
  });

  test('open resource blocklet', async ({ page }) => {
    const blocklet = page.locator('.component-item').filter({ hasText: 'Mockplexity' });
    // 首先判断状态, 如果运行中, 什么都不做
    const stopIcon = blocklet.getByTestId('StopIcon');
    if ((await stopIcon.count()) > 0) {
      return;
    }
    // 如果未运行(升级中/停止), 则运行
    const startIcon = blocklet.getByTestId('PlayArrowIcon');
    if ((await startIcon.count()) > 0) {
      await startIcon.click();
      await blocklet.getByTestId('StopIcon').waitFor();
    }
  });

  const secretKey = 'f712dac84b4f84c3c2fa079896572ed19e2738e23baf025f2c8764d5d8598deb';
  test('set agent secrets', async ({ page }) => {
    await page.goto('/mockplexity/');
    await page.getByTestId('aigne-runtime-header-menu-button').click();
    await page.getByRole('menuitem', { name: 'Settings' }).click();
    const agentSecrets = page.locator('input');
    await agentSecrets.click();
    await agentSecrets.fill(secretKey);
    await page.locator('button:has-text("Save")').click();
  });

  test('input form', async ({ page }) => {
    await page.goto('/mockplexity/');
    page.route(/\/api\/ai\/call/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        path: 'tests/mockplexity-ai-stream-response.txt',
      });
    });
    const question = 'What is the arcblock?';
    await page.getByTestId('runtime-input-question').click();
    await page.getByTestId('runtime-input-question').fill(question);
    await page.getByTestId('runtime-submit-button').click();

    // 等待按钮不再具有特定的类(class)
    const buttonSelector = `button[type=submit]`;
    await page.waitForFunction((buttonSelector) => {
      const button = document.querySelector(buttonSelector);
      return !button!.classList.contains('MuiLoadingButton-loading'); // 等待按钮不再具有 'some-class'
    }, buttonSelector);

    const lastMessage = page.locator('.message-item').last();
    const assistantMessage = await lastMessage.locator('.assistant-message-content');
    await expect(assistantMessage).toContainText(question);
    await expect(assistantMessage).toContainText('Sources');
    await expect(assistantMessage).toContainText('Answer');
    await expect(assistantMessage).toContainText('Related');
  });

  test('clear session', async ({ page }) => {
    await page.goto('/mockplexity/');
    await page.getByTestId('aigne-runtime-header-menu-button').click();
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('clear') && response.status() === 200
    );
    await page.getByRole('menuitem', { name: 'Clear Session' }).click();
    await responsePromise;

    const message = await page.locator('.message-item').all();
    expect(message.length).toBe(0);
  });
});
