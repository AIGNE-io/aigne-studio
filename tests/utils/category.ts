import { Page, expect } from '@playwright/test';

export async function deleteCategory({ page }: { page: Page }) {
  await page.goto('/admin/category');
  await page.waitForLoadState('networkidle');

  const deleteAllCategories = async () => {
    const categoryItems = page.getByTestId('category-delete-button');
    const count = await categoryItems.count();

    if (count === 0) return;

    await categoryItems.last().click();
    const deleteResponse = page.waitForResponse(
      (response) => response.url().includes('/api/categories') && response.status() === 200
    );
    await page.getByRole('button', { name: 'Delete' }).click();
    await deleteResponse;

    await deleteAllCategories();
  };

  await deleteAllCategories();

  const categoryItems = page.getByTestId('category-delete-button');
  await expect(categoryItems).toHaveCount(0);
}
