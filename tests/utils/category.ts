import { Page, expect } from '@playwright/test';

export async function deleteCategory({ page }: { page: Page }) {
  await page.goto('/admin/category');
  await page.waitForLoadState('networkidle', { timeout: 20000 });

  const categoryItems = await page.getByTestId('category-delete-button').all();

  for (let i = categoryItems.length - 1; i >= 0; i--) {
    await categoryItems[i]?.click();
    const deleteResponse = page.waitForResponse(
      (response) => response.url().includes('/api/categories') && response.status() === 200
    );
    await page.getByRole('button', { name: 'Delete' }).click();
    await deleteResponse;
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  }

  const deployItems = page.getByTestId('category-delete-button');
  await expect(deployItems).toHaveCount(0);
}
