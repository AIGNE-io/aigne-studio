import { Page, expect } from '@playwright/test';

export async function deleteDeploy({ page }: { page: Page }) {
  await page.goto('/admin/explore');
  await page.waitForLoadState('networkidle');

  const deleteAllDeploy = async () => {
    const deployItems = page.getByTestId('delete-deployment-button');
    const count = await deployItems.count();

    if (count === 0) return;

    const deleteResponse = page.waitForResponse(
      (response) => response.url().includes('api/deployments') && response.status() === 200
    );
    await deployItems.last().click();
    await deleteResponse;

    await deleteAllDeploy();
  };

  await deleteAllDeploy();

  const deployItems = page.getByTestId('delete-deployment-button');
  await expect(deployItems).toHaveCount(0);
}
