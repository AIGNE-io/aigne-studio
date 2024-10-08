import { Page, expect } from '@playwright/test';

export async function deleteDeploy({ page }: { page: Page }) {
  await page.goto('/admin/explore');
  await page.waitForLoadState('networkidle');

  const categoryItems = await page.getByTestId('delete-deployment-button').all();

  for (let i = categoryItems.length - 1; i >= 0; i--) {
    const deleteResponse = page.waitForResponse(
      (response) => response.url().includes('api/deployments') && response.status() === 200
    );
    await categoryItems[i]?.click();
    await deleteResponse;
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  }

  const deployItems = page.getByTestId('delete-deployment-button');
  await expect(deployItems).toHaveCount(0);
}
