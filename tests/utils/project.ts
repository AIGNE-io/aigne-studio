import { Page, expect } from '@playwright/test';

export async function createProject({ page }: { page: Page }) {
  await page.goto('/projects');

  await page.getByTestId('newProject').click();

  page
    .locator('[role=menuitem]')
    .filter({ hasText: 'Blank' })
    .click({ timeout: 3000 })
    .catch((error) => console.warn('Failed to select project type "Blank" from the menu.', error));

  const newProjectDialog = page.getByTestId('newProjectDialog');
  await expect(newProjectDialog).toBeVisible();

  const nameField = newProjectDialog.getByTestId('projectNameField').locator('input');
  await nameField.fill(`Test Project ${Date.now()}`);
  await nameField.press('Enter');

  await page.waitForURL(/\/projects\/\w+/, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=project-page-prompts]');
}
