import { Locator, Page, expect } from '@playwright/test';

export async function createProjectDialog({ page }: { page: Page }) {
  const newProjectDialog = page.getByTestId('newProjectDialog');
  await expect(newProjectDialog).toBeVisible();

  const projectName = `Test Project ${Date.now()}`;

  const createProjectPromise = page.waitForResponse(
    (response) => response.url().includes('/api/projects') && response.status() === 200,
    {}
  );
  await newProjectDialog.getByTestId('projectNameField').locator('input').fill(projectName);
  await page.fill('[data-testid="projectDescriptionField"] textarea', 'This is a description of my new project.');

  const createButton = newProjectDialog.getByRole('button', { name: 'Create' });
  await Promise.all([createButton.click(), page.waitForLoadState('networkidle')]);
  await expect(newProjectDialog).not.toBeVisible();
  await createProjectPromise;
}

export async function createProject({ page }: { page: Page }) {
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('Create a project to get started')).toBeVisible();

  await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();

  await page.getByRole('button', { name: 'New Project' }).click();

  await createProjectDialog({ page });
}

export async function deleteProject({ page }: { page: Page }) {
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();

  const projects = await page.getByTestId('projects-item').all();
  console.log('projects', projects);

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

  await page.waitForTimeout(1000);
  await expect(page.getByText('Create a project to get started')).toBeVisible();
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

export const enterAgentPage = async ({ page }: { page: Page }) => {
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();
  const projects = await page.getByTestId('projects-item').all();

  await expect(projects.length).toBeGreaterThan(0);

  const firstProject = projects[0];
  if (firstProject) {
    const projectId = await firstProject.getAttribute('data-id');
    const firstProjectName = await firstProject.locator('.name').innerText();

    await firstProject.click();
    await page.waitForLoadState('networkidle');

    const path = `/projects/${projectId}`;

    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      await page.goto(path);
      try {
        await expect(page.getByText(firstProjectName)).toBeVisible({ timeout: 20000 });
        break;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw new Error(`Failed to load project page after ${maxRetries} attempts`);
        }
      }
    }
  }
};
