import { expect } from '@playwright/test';
import test from '../../utils/base';

test.describe.serial('routing permissions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('projects', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL('projects');
  });

  test('admin', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL('admin');
  });

  test('explore', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/explore/);
  });

  test('apps', async ({ page }) => {
    await page.goto('/apps/1');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL('apps');
    await expect(page.getByText('current agent application not published')).toBeVisible();
  });
});
