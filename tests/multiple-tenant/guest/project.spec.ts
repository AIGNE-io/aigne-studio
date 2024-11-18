import { expect, test } from '@playwright/test';

import { createProjectDialog, deleteProject } from '../../utils/project';

test.beforeEach('clean and create project', async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');

  await deleteProject({ page });
});

test.describe.serial('project', () => {
  test('add project', async ({ page }) => {
    // one project
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();
    await page.getByRole('button', { name: 'New Project' }).click();
    await createProjectDialog({ page });

    // two project
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();
    await page.getByRole('button', { name: 'New Project' }).click();
    await createProjectDialog({ page });

    // three project
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();
    await page.getByRole('button', { name: 'New Project' }).click();
    await createProjectDialog({ page });

    // check three project
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projects = await page.getByTestId('projects-item');
    await expect(projects).toHaveCount(3);
  });
});
