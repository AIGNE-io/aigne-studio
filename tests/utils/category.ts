/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
import { Page, expect } from '@playwright/test';

export async function deleteCategory({ page }: { page: Page }) {
  await page.goto('/admin/category');
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    const categoryItems = await page.getByTestId('category-delete-button').all();
    console.log(`Found ${categoryItems.length} category items`);

    if (categoryItems.length === 0) {
      console.log('No more categories to delete');
      break;
    }

    while ((await page.getByTestId('category-delete-button').count()) > 0) {
      await page.getByTestId('category-delete-button').first().click();

      const deleteResponse = page.waitForResponse(
        (response) => response.url().includes('/api/categories') && response.status() === 200
      );
      await page.getByTestId('dialog-ok-button').click();
      await deleteResponse;
      await page.locator('.SnackbarItem-action').first().locator('button').click();
    }

    const remainingItems = await page.getByTestId('category-delete-button').count();
    if (remainingItems === 0) {
      break;
    } else {
      retries++;
      if (retries === maxRetries) {
        console.log(`Failed to delete all categories after ${maxRetries} attempts`);
      }
    }
  }

  await page.waitForTimeout(2000);
  const deployItems = page.getByTestId('category-delete-button');
  await expect(deployItems).toHaveCount(0, { timeout: 15000 });
}
