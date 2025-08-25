import { expect } from '@playwright/test';
import test from '../../utils/base';
import { deleteCategory } from '../../utils/category';

test.beforeAll('delete category', async ({ browser }) => {
  const page = await browser.newPage();
  await deleteCategory({ page });
});

test.describe.serial('category', () => {
  test('add category', async ({ page }) => {
    await page.goto('/admin/category');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('No Categories')).toBeVisible();

    // 添加第一个分类
    await page.getByTestId('add-category-button').click();
    await expect(page.getByTestId('add-category-form')).toBeVisible();
    const addCategoryForm = page.getByTestId('add-category-form');

    const addOneCategoryResponse = page.waitForResponse(
      (response) => response.url().includes('/api/categories') && response.status() === 200
    );
    await addCategoryForm.getByTestId('name-field').locator('input').fill('production');
    await addCategoryForm.getByTestId('slug-field').locator('input').fill('production');
    await addCategoryForm.getByTestId('orderIndex-field').locator('input').fill('1');
    await addCategoryForm.getByTestId('icon-field').locator('input').fill('tabler:a-b');
    await page.getByTestId('save-button').click();
    await addOneCategoryResponse;

    await expect(page.getByTestId('add-category-form')).not.toBeVisible();

    // 添加第二个分类
    await page.getByTestId('add-category-button').click();
    await expect(page.getByTestId('add-category-form')).toBeVisible();
    const addTwoCategoryResponse = page.waitForResponse(
      (response) => response.url().includes('/api/categories') && response.status() === 200
    );
    await addCategoryForm.getByTestId('name-field').locator('input').fill('test1');
    await addCategoryForm.getByTestId('slug-field').locator('input').fill('test1');
    await addCategoryForm.getByTestId('orderIndex-field').locator('input').fill('1');
    await addCategoryForm.getByTestId('icon-field').locator('input').fill('tabler:alert-circle');
    await page.getByTestId('save-button').click();
    await addTwoCategoryResponse;

    await expect(page.getByTestId('add-category-form')).not.toBeVisible();

    // 添加第三个分类
    await page.getByTestId('add-category-button').click();
    await expect(page.getByTestId('add-category-form')).toBeVisible();
    const addThreeCategoryResponse = page.waitForResponse(
      (response) => response.url().includes('/api/categories') && response.status() === 200
    );
    await addCategoryForm.getByTestId('name-field').locator('input').fill('test2');
    await addCategoryForm.getByTestId('slug-field').locator('input').fill('test2');
    await addCategoryForm.getByTestId('orderIndex-field').locator('input').fill('1');
    await addCategoryForm.getByTestId('icon-field').locator('input').fill('tabler:accessible');
    await page.getByTestId('save-button').click();
    await addThreeCategoryResponse;

    await expect(page.getByTestId('add-category-form')).not.toBeVisible();
  });

  test('update category', async ({ page, context }) => {
    await page.goto('/admin/category');
    await page.waitForLoadState('networkidle');

    // 编辑按钮
    const categoryItems = await page.getByTestId('category-edit-button');
    const lastCategoryItem = await categoryItems.first();
    await expect(lastCategoryItem).toBeVisible();
    await lastCategoryItem.click();

    // 编辑弹窗
    const editForm = page.getByTestId('add-category-form');
    await expect(editForm).toBeVisible();
    const updateCategoryResponse = page.waitForResponse(
      (response) => response.url().includes('/api/categories') && response.status() === 200
    );
    await editForm.getByTestId('name-field').locator('input').fill('Updated Category');
    await editForm.getByTestId('slug-field').locator('input').fill('updated-category');
    await editForm.getByTestId('orderIndex-field').locator('input').fill('0');
    await editForm.getByTestId('icon-field').locator('input').fill('tabler:accessible-filled');
    await page.getByTestId('save-button').click();
    await updateCategoryResponse;
    await expect(editForm).not.toBeVisible();

    await expect(page.getByTestId('category-item').first()).toHaveText('Updated Category');

    // 分享按钮
    await page.getByTestId('category-link-button').first().click();
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('category-link-button').first().click(),
    ]);
    await newPage.waitForLoadState('networkidle');
    await expect(newPage).toHaveURL('/explore/updated-category', { timeout: 10000 });
    await expect(newPage.getByTestId('categories-sidebar')).toBeVisible();

    // 检查分类是否正确
    const exploreCategoryItems = newPage.getByTestId('categories-sidebar').getByTestId('category-item');
    const firstExploreCategoryItem = exploreCategoryItems.first();
    await expect(firstExploreCategoryItem).toHaveClass(/Mui-selected/);
    await expect(firstExploreCategoryItem).toContainText('Updated Category');
    await expect(firstExploreCategoryItem.getByTestId('category-icon')).toHaveAttribute(
      'data-icon',
      'tabler:accessible-filled'
    );
  });
});
