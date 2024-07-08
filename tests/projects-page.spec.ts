import { logout } from '@blocklet/testlab/utils/playwright';
import { expect, test } from '@playwright/test';

test('has example projects', async ({ page }) => {
  await page.goto('/projects');

  await page.waitForURL((url) => {
    console.log(url);
    return url.pathname.startsWith('/projects');
  });

  const examples = page.getByTestId('projects-examples');
  await examples.waitFor();

  await expect(examples).not.toBeEmpty();

  await logout({ page });
});

test('create project', async ({ page }) => {
  await page.goto('/projects');

  const examples = page.getByTestId('projects-examples');
  await examples.waitFor();

  const newProjectButton = page.getByTestId('newProject');
  await expect(newProjectButton).toBeVisible();

  await newProjectButton.click();
  const newProjectDialog = page.getByTestId('newProjectDialog');
  await expect(newProjectDialog).toBeVisible();

  const nameField = newProjectDialog.getByTestId('projectNameField').locator('input');
  await nameField.fill('Test Project');
  await nameField.press('Enter');

  await page.waitForURL(/\/projects\/\w+/, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=project-page-prompts]');
});
