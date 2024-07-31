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
