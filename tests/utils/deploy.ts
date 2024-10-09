/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
import { Page, expect } from '@playwright/test';

export async function deleteDeploy({ page }: { page: Page }) {
  await page.goto('/admin/explore');
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    const deployItems = await page.getByTestId('delete-deployment-button').all();
    console.log(`Found ${deployItems.length} deployment items`);

    if (deployItems.length === 0) {
      console.log('No more deployments to delete');
      break;
    }

    for (const item of deployItems) {
      await item.scrollIntoViewIfNeeded();
      await item.click();

      const deleteResponse = page.waitForResponse(
        (response) => response.url().includes('/api/deployments') && response.status() === 200
      );
      await page.getByTestId('dialog-ok-button').click();
      await deleteResponse;
    }

    const remainingItems = await page.getByTestId('delete-deployment-button').count();
    if (remainingItems === 0) {
      console.log('All deployments deleted successfully');
      break;
    } else {
      console.log(`${remainingItems} deployments remaining. Retrying...`);
      retries++;
      if (retries === maxRetries) {
        console.log(`Failed to delete all deployments after ${maxRetries} attempts`);
      }
    }
  }

  // Final check
  await page.waitForTimeout(2000);
  const finalDeployItems = page.getByTestId('delete-deployment-button');
  await expect(finalDeployItems).toHaveCount(0, { timeout: 15000 });
}
