import { expect, test } from '@playwright/test';

test.beforeEach('route to blocklets', async ({ page }) => {
  await page.goto('.well-known/service/admin/overview');
  await page.waitForSelector('h6.page-title');
  await page.locator("button span:has-text('Blocklets')").click();
  await page.waitForSelector('button:has-text("Add Blocklet")');
});

test('install resource blocklet', async ({ page }) => {
  await page.locator('button:has-text("Add Blocklet")').click();
  await page.locator("h6:has-text('Add Blocklet')").waitFor();
  const searchInput = page.locator('input[placeholder="Search the store"]');
  await searchInput.click();
  await searchInput.fill('mockplexity');
  await searchInput.press('Enter');
  await page.waitForSelector('h3 span:has-text("Mockplexity")');
  await page.locator('button:has-text("Choose")').click();
  await page.locator('button div:has-text("Add Mockplexity")').click();
  await page.locator('button div:has-text("Agree to the EULA and continue")').click();
  await page.locator('button div:has-text("Next")').click();
  await page.locator('button div:has-text("Complete")').click();
});

test('open resource blocklet', async ({ page }) => {
  const blocklet = page.locator('.component-item').filter({ hasText: 'Mockplexity' });
  // 未启动
  const startIcon = blocklet.getByTestId('PlayArrowIcon');
  if ((await startIcon.count()) > 0) {
    // 如果存在，则点击
    await startIcon.click();
  }
  await blocklet.getByTestId('StopIcon').waitFor();
});

const secretKey = 'f712dac84b4f84c3c2fa079896572ed19e2738e23baf025f2c8764d5d8598deb';
test('set agent secrets', async ({ page }) => {
  await page.goto('/mockplexity/');
  await page.getByTestId('aigne-runtime-header-menu-button').click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  const agentSecrets = page.locator('input[placeholder="Get your API Key from SerpAPI and enter it here"]');
  await agentSecrets.click();
  await agentSecrets.fill(secretKey);
  await page.locator('button:has-text("Save")').click();
});

test('input form', async ({ page }) => {
  await page.goto('/mockplexity/');
  await page.getByTestId('runtime-input-question').click();
  await page.getByTestId('runtime-input-question').fill('What is the arcblock?');
  await page.getByRole('button', { name: 'Generate' }).click();

  // 等待按钮不再具有特定的类(class)
  const buttonSelector = `button[type=submit]`;

  await page.waitForFunction((buttonSelector) => {
    const button = document.querySelector(buttonSelector);
    return !button!.classList.contains('MuiLoadingButton-loading'); // 等待按钮不再具有 'some-class'
  }, buttonSelector);

  const message = await page.locator('.message-item').last();
  expect(await message.textContent()).toContain('arcblock');
  expect(await message.textContent()).toContain('Answer');
  expect(await message.textContent()).toContain('Sources');
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
