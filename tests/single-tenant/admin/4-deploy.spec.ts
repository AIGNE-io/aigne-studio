import { expect } from '@playwright/test';
import test from '../../utils/base';
import { createProject } from '../../utils/project';

let projectUrl: string;

test.beforeAll('clean and create project', async ({ browser }) => {
  const page = await browser.newPage();
  await createProject({ page });
  projectUrl = page.url();
});

test.describe.serial('deploy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(projectUrl);
    await page.waitForLoadState('networkidle');
  });

  test('user create deploy', async ({ page }) => {
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
  });

  test('user update deploy', async ({ page }) => {
    const agentNameInput = page.getByTestId('agent-name').locator('input');
    await expect(agentNameInput).toBeVisible();
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

    await page.getByTestId('deploy-button').click();
    await expect(page.getByTestId('update-deploy-dialog')).toBeVisible();
    const getTwoDeployResponse = page.waitForResponse(
      (response) => response.url().includes('/api/deployments') && response.status() === 200
    );
    await page.getByTestId('public-visibility-label').click();
    await page.getByTestId('update-deploy-button').click();
    await getTwoDeployResponse;

    await expect(page.getByTestId('save-button')).toBeDisabled();
  });
});
