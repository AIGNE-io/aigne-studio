import { Locator, Page, expect } from '@playwright/test';

export async function createProject({ page }: { page: Page }) {
  await page.goto('/projects');
  await page.getByTestId('projects-examples').waitFor();
  await page.getByTestId('newProject').click();

  await page
    .locator('[role=menuitem]')
    .filter({ hasText: 'Blank' })
    .click({ timeout: 3000 })
    .catch((error) => console.warn('Failed to select project type "Blank" from the menu.', error));

  const newProjectDialog = page.getByTestId('newProjectDialog');
  await expect(newProjectDialog).toBeVisible();

  const createProjectPromise = page.waitForResponse(
    (response) => response.url().includes('/api/projects') && response.status() === 200,
    {}
  );
  const nameField = newProjectDialog.getByTestId('projectNameField').locator('input');
  await nameField.fill(`Test Project ${Date.now()}`);
  await nameField.press('Enter');
  await createProjectPromise;

  await page.waitForSelector('span[aria-label="Import Agents"]');
  await page.getByLabel('New Agent').getByRole('button').click({ force: true });
}

export async function deleteProject({ page }: { page: Page }) {
  await page.goto('/projects');
  await page.getByTestId('projects-examples').waitFor();
  const projects = await page.locator('.projects-projects-item').all();

  for (let i = projects.length - 1; i >= 0; i--) {
    await projects[i]?.hover();
    await projects[i]?.locator('.action').click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const element = page.getByText('This will permanently delete project with name');
    const text = await element.textContent();

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/projects') && response.status() === 200,
      {}
    );
    const match = (text || '').match(/"([^"]*)"/);
    if (match && match[1]) {
      await page.getByLabel('Please input ').click();
      await page.getByLabel('Please input ').fill(match[1]);
      await page.getByRole('button', { name: 'Delete' }).click();
    }
    await responsePromise;
  }
}

export async function deleteOneProject({ page, project }: { page: Page; project: Locator }) {
  await project.hover();
  await project.locator('.action').click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  const element = page.getByText('This will permanently delete project with name');
  const text = await element.textContent();

  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/projects') && response.status() === 200,
    {}
  );
  const match = (text || '').match(/"([^"]*)"/);
  if (match && match[1]) {
    await page.getByLabel('Please input ').click();
    await page.getByLabel('Please input ').fill(match[1]);
    await page.getByRole('button', { name: 'Delete' }).click();
  }
  await responsePromise;
}

export async function toggleAIChat({ page }: { page: Page }) {
  await page.goto('/projects');
  const aiChatProject = page.locator('.projects-examples-item').filter({ hasText: 'AI Chat' }).first();
  await aiChatProject.click();

  await page.waitForSelector('span[aria-label="Import Agents"]');
}
