import { Locator, Page, expect } from '@playwright/test';

const format = () => {
  const now = new Date();

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${hours}-${minutes}-${seconds}-${now.getTime()}`;
};

export async function createProjectDialog({ page }: { page: Page }) {
  const newProjectDialog = page.getByTestId('newProjectDialog');
  await expect(newProjectDialog).toBeVisible();

  const projectName = `Test Project ${format()}`;

  const createProjectPromise = page.waitForResponse(
    (response) => response.url().includes('/api/projects') && response.status() === 200
  );
  await newProjectDialog.getByTestId('projectNameField').locator('input').fill(projectName);
  await page.fill('[data-testid="projectDescriptionField"] textarea', 'This is a description of my new project.');

  const createButton = newProjectDialog.getByRole('button', { name: 'Create' });
  await Promise.all([createButton.click(), page.waitForLoadState('networkidle')]);
  await expect(newProjectDialog).not.toBeVisible();
  await createProjectPromise;

  await page.goto('/projects');
  await page.waitForLoadState('networkidle');

  const targetProject = await page
    .locator('[data-testid="projects-item"]')
    .filter({ has: page.locator('.name', { hasText: projectName }) })
    .first();
  await expect(targetProject).toBeVisible({ timeout: 5000 });

  if (targetProject) {
    const projectId = await targetProject.getAttribute('data-id');
    const firstProjectName = await targetProject.locator('.name').innerText();

    await targetProject.click();
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
}

export async function createProject({
  page,
  checkCreated = true,
  checkCount = false,
}: {
  page: Page;
  checkCreated?: boolean;
  checkCount?: boolean;
}) {
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();

  if (checkCreated) {
    const projectItems = page.getByTestId('projects-item');
    const createNewProject = checkCount ? (await projectItems.count()) === 0 : true;

    if (createNewProject) {
      await page.getByRole('button', { name: 'New Project' }).click();
      await createProjectDialog({ page });
    }
  }
}

export async function deleteProject({ page }: { page: Page }) {
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();

  const projects = await page.getByTestId('projects-item').all();
  await page.waitForTimeout(1000);

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
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  }

  await page.waitForTimeout(1000);
  const projectItems = page.getByTestId('projects-item');
  await expect(projectItems).toHaveCount(0);
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
