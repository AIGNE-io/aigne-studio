import { Page } from '@playwright/test';

export const unInstallBlocklet = async (page: Page, blockletName: string) => {
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

export const installBlocklet = async (page: Page) => {
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
};
