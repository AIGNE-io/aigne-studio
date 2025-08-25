import { expect } from '@playwright/test';
import test from '../../utils/base';

test.describe.serial('routing permissions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('projects', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/projects/);
  });

  test('admin', async ({ page }) => {
    await page.goto('/admin/explore');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/admin/);
  });

  test('explore', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/explore/);
  });

  test('apps', async ({ page }) => {
    await page.goto('/apps');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/apps/);
  });
});
