/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
import { Page, expect } from '@playwright/test';

export async function deleteDeploy({ page }: { page: Page }) {
  await page.goto('/admin/explore');
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  const maxRetries = 3;
  const retries = 0;

  while (retries < maxRetries) {
    const deployItems = await page.getByTestId('delete-deployment-button').all();
    console.log(`Found ${deployItems.length} deployment items`);

    if (deployItems.length === 0) {
      console.log('No more deployments to delete');
      break;
    }

    while ((await page.getByTestId('delete-deployment-button').count()) > 0) {
      await page.getByTestId('delete-deployment-button').first().click();

      const deleteResponse = page.waitForResponse(
        (response) => response.url().includes('/api/deployments') && response.status() === 200
      );
      await page.getByTestId('dialog-ok-button').click();
      await deleteResponse;
      await page.locator('.SnackbarItem-action').first().locator('button').click();
    }
  }

  // Final check
  await page.waitForTimeout(2000);
  const finalDeployItems = page.getByTestId('delete-deployment-button');
  await expect(finalDeployItems).toHaveCount(0, { timeout: 15000 });
}
