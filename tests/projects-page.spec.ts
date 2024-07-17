import { expect, test } from '@playwright/test';

test('has example projects', async ({ page }) => {
  await page.goto('/projects');

  const examples = page.getByTestId('projects-examples');
  await examples.waitFor();

  await expect(examples).not.toBeEmpty();
});

test('create project', async ({ page }) => {
  await page.goto('/projects');

  const examples = page.getByTestId('projects-examples');
  await examples.waitFor();

  await page.getByTestId('newProject').click();

  await page.locator('[role=menuitem]').filter({ hasText: 'Blank' }).click();

  const newProjectDialog = page.getByTestId('newProjectDialog');
  await expect(newProjectDialog).toBeVisible();

  const nameField = newProjectDialog.getByTestId('projectNameField').locator('input');
  await nameField.fill('Test Project');
  await nameField.press('Enter');

  await page.waitForURL(/\/projects\/\w+/, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=project-page-prompts]');
});
