import { expect } from '@playwright/test';
import test from '../../utils/base';
import { createProjectDialog } from '../../utils/project';

test.describe.serial('explore', () => {
  test('add one deployment', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('create-project-button').click();
    await createProjectDialog({ page });

    // 发布 deployment
    await page.getByTestId('new-agent-button').click();
    await page.getByTestId('file-tree').click();

    const agentNameInput = page.getByTestId('agent-name').locator('input');
    await expect(agentNameInput).toBeVisible();
    await agentNameInput.click();

    await agentNameInput.fill(`Test Agent ${Date.now()}`);

    await page.getByTestId('deploy-button').click();
    await expect(page.getByTestId('create-deploy-popper')).toBeVisible();

    const addDeployResponse = page.waitForResponse(
      (response) => response.url().includes('/api/deployments') && response.status() === 200
    );
    await page.getByTestId('add-deploy-button').click();
    await addDeployResponse;

    await expect(page.getByTestId('save-button')).toBeDisabled();
    await page.locator('.SnackbarItem-action').first().locator('button').click();
  });

  test('add category for deployment', async ({ page }) => {
    await page.goto('/admin/explore');
    await page.waitForLoadState('networkidle');

    const container = page.locator('.MuiDataGrid-root');
    await expect(container).toBeVisible();

    await page.getByTestId('edit-deployment-button').first().click();
    const addCategoryForm = page.getByTestId('deployment-dialog');
    await expect(addCategoryForm).toBeVisible();

    const addCategoryResponse = page.waitForResponse(
      (response) => response.url().includes('/admin/deployments') && response.status() === 200
    );
    await page.getByTestId('category-select-input').click();
    await page.waitForSelector('[role="listbox"] [role="option"]');
    await page.locator('[role="listbox"] [role="option"]').filter({ hasText: 'production' }).first().click();
    await page.getByTestId('update-button').click();
    await addCategoryResponse;
  });

  test('visit explore card detail', async ({ page }) => {
    await page.goto('/explore/production');
    await page.waitForLoadState('networkidle');

    const listPage = page.getByTestId('explore-list');
    await expect(listPage).toBeVisible();

    const card = page.getByTestId('explore-card');
    await expect(card).toHaveCount(1);

    await card.first().click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('readme-tab')).toBeVisible();

    await expect(page.getByTestId('run-button')).toBeVisible();
    await expect(page.getByTestId('make-yours-button')).toBeVisible();
    await expect(page.getByTestId('share-button')).toBeVisible();

    await page.getByTestId('share-button').click();

    await expect(page.getByTestId('copy-link')).toBeVisible();
    await expect(page.getByTestId('share-on-twitter')).toBeVisible();

    const addCategoryResponse = page.waitForResponse((response) => response.url().includes('/api/projects'));
    await page.getByTestId('make-yours-button').click();
    await addCategoryResponse;
  });
});
