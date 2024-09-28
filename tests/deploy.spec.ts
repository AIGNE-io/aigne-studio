import { expect, test } from '@playwright/test';

import { createProject, deleteProject } from './utils/project';

test.beforeEach('create project', async ({ page }) => {
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');

  await deleteProject({ page });
  await createProject({ page });
});

test('user create deploy and update deploy', async ({ page }) => {
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();
  const projects = await page.getByTestId('projects-projects-item').all();

  await expect(projects.length).toBeGreaterThan(0);

  const firstProject = projects[0];
  if (firstProject) {
    const firstProjectName = await firstProject.locator('.name').innerText();

    await firstProject.click();
    await expect(page).toHaveURL(/\/projects\/.*/, { timeout: 10000 });
    await expect(page.getByText(firstProjectName)).toBeVisible();
  }

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

  // 需要点击两下，测试关闭弹窗
  await agentNameInput.click();
  await page.waitForTimeout(3000);
  await agentNameInput.click();

  await page.getByTestId('deploy-button').click();
  await expect(page.getByTestId('update-deploy-dialog')).toBeVisible();

  const updateDeployResponse = page.waitForResponse(
    (response) => response.url().includes('/api/deployments') && response.status() === 200
  );
  await page.getByTestId('private-visibility-label').click();
  await page.getByTestId('update-deploy-button').click();
  await updateDeployResponse;

  await expect(page.getByTestId('save-button')).toBeDisabled();

  await agentNameInput.click();
  await expect(page.getByTestId('update-deploy-dialog')).not.toBeVisible();

  await agentNameInput.fill(`Update Agent ${Date.now()}`);
  await expect(page.getByTestId('save-button')).not.toBeDisabled();
});

test.afterEach('delete project', async ({ page }) => {
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');

  await deleteProject({ page });
});
