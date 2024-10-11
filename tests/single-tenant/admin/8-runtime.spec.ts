import { expect, test } from '@playwright/test';

import { installBlocklet, unInstallBlocklet } from '../../utils/uninstall';

test.beforeEach('route to blocklets', async ({ page }) => {
  await page.goto('.well-known/service/admin/overview');
  await page.waitForSelector('h6.page-title');
  await page.locator("button span:has-text('Blocklets')").click();
  await page.waitForSelector('button:has-text("Add Blocklet")');
});

test.describe.serial('resource blocklet', () => {
  test('init', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

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

    await blocklet.locator('span:has-text("Running")').waitFor();
    await page.locator('.component-item').filter({ hasText: 'SerpApi' }).locator('span:has-text("Running")').waitFor();
  });

  const secretKey = 'f712dac84b4f84c3c2fa079896572ed19e2738e23baf025f2c8764d5d8598deb';
  test('set agent secrets', async ({ page }) => {
    await page.goto('/mockplexity/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('aigne-runtime-header-menu-button').click();
    await page.getByRole('menuitem', { name: 'Settings' }).click();
    const agentSecrets = page.locator('input');
    await agentSecrets.click();
    await agentSecrets.fill(secretKey);
    await page.locator('button:has-text("Save")').click();
  });

  test('input form', async ({ page }) => {
    await page.goto('/mockplexity/');
    await page.waitForLoadState('networkidle');

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

    const responsePromise = page.waitForResponse((response) => response.url().includes('/api/ai/call'));
    await page.getByTestId('runtime-submit-button').click();
    await responsePromise;
  });

  test('clear session', async ({ page }) => {
    await page.goto('/mockplexity/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('aigne-runtime-header-menu-button').click();
    await page.getByRole('menuitem', { name: 'Clear Session' }).click();

    const message = await page.locator('.message-item').all();
    expect(message.length).toBe(0);
  });
});
