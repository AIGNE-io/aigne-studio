import { Page, expect, test } from '@playwright/test';

const unInstallBlocklet = async (page: Page, blockletName: string) => {
  const blocklet = page.locator('.component-item').filter({ hasText: blockletName });
  // 没有该 blocklet
  if ((await blocklet.count()) === 0) {
    return;
  }
  const stopIcon = blocklet.getByTestId('StopIcon');
  // 该 blocklet 已启动
  if ((await stopIcon.count()) > 0) {
    await stopIcon.click();
    await page.locator("button:has-text('Yes, Stop It')").click();
  }
  await blocklet.getByTestId('PlayArrowIcon').waitFor();
  await blocklet.getByTestId('MoreHorizIcon').click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  const promise = page.waitForResponse((response) => response.url().includes('api/gql') && response.status() === 200);
  await page.locator('button:has-text("Confirm")').click();
  await promise;
};

// TOTO: 思考有没有beforeEach的方案
test.beforeEach('route to blocklets', async ({ page }) => {
  await page.goto('.well-known/service/admin/overview');
  await page.waitForSelector('h6.page-title');
  await page.locator("button span:has-text('Blocklets')").click();
  await page.waitForSelector('button:has-text("Add Blocklet")');
});

test.describe.serial('resource blocklet', () => {
  // todo: 抽象出一个函数，用于删除 blocklet
  test('uninstall resource blocklet', async ({ page }) => {
    await unInstallBlocklet(page, 'Mockplexity');
    await unInstallBlocklet(page, 'SerpApi');
  });

  test('install resource blocklet', async ({ page }) => {
    await page.locator('button:has-text("Add Blocklet")').click();
    await page.waitForSelector('.arcblock-blocklet');
    const searchInput = page.locator('input[placeholder="Search the store"]');
    await searchInput.fill('mockplexity');

    await page.waitForSelector('h3 span:has-text("Mockplexity")');
    const mockplexity = page.locator('.arcblock-blocklet ').filter({ hasText: 'Mockplexity' });
    const chooseBtn = mockplexity.locator('button:has-text("Choose")');
    if (await chooseBtn.isVisible()) {
      await chooseBtn.click();
      await page.locator('button div:has-text("Add Mockplexity")').click();
      await page.locator('button div:has-text("Agree to the EULA and continue")').click();
      await page.locator('button div:has-text("Next")').click();
      await page.locator('button div:has-text("Complete")').click();
    } else {
      await mockplexity.locator('button:has-text("Cancel")').click;
    }
  });

  test('open resource blocklet', async ({ page }) => {
    const blocklet = page.locator('.component-item').filter({ hasText: 'Mockplexity' });
    // 首先判断状态, 如果运行中, 什么都不做
    const stopIcon = blocklet.getByTestId('StopIcon');
    if ((await stopIcon.count()) > 0) {
      return;
    }
    // 如果未运行, 则运行
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
