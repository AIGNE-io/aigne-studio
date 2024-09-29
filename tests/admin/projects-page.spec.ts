import { login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';
import { expect, test } from '@playwright/test';

import { createProject, deleteOneProject, deleteProject } from '../utils/project';

test.beforeEach('clean and create project', async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');

  await deleteProject({ page });
  await createProject({ page });
});
test.describe.serial('project', () => {
  test('copy/edit project', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const firstProjectItem = await page
      .getByTestId('projects-projects')
      .locator('>div')
      .filter({ hasText: 'Test Project' });
    await firstProjectItem.hover();
    await firstProjectItem.getByRole('button').click();

    const copyProjectPromise = page.waitForResponse(
      (response) => response.url().includes('/api/projects') && response.status() === 200
    );
    await page.getByRole('menuitem', { name: 'Copy to My Projects' }).click();
    await copyProjectPromise;

    const projects = page.getByTestId('projects-projects');
    const projectCount = await projects.locator('>div');
    await expect(projectCount).toHaveCount(2);

    const aiChatCopy = await projects.locator('>div:has-text("Copy")').first();
    await aiChatCopy.hover({ force: true });
    await aiChatCopy.getByRole('button').click({ force: true });
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    const newTitle = `AI Chat Copy Edit ${Date.now()}`;
    await page.getByLabel('Project name').fill(newTitle);
    const aiChatCopyPromise = page.waitForResponse(
      (response) => response.url().includes('/api/projects') && response.status() === 200
    );
    await page.getByRole('button', { name: 'Save' }).click();
    await aiChatCopyPromise;
    await expect(aiChatCopy.locator('.name')).toHaveText(newTitle);

    const newAiChatCopy = await projects.locator('>div').filter({ hasText: newTitle }).first();
    await newAiChatCopy.hover();
    await newAiChatCopy.getByRole('button').click();
    const pinMenuItem = page.getByRole('menuitem', { name: 'Pin' });
    await expect(pinMenuItem).toBeVisible();

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/projects') && response.status() === 200,
      {}
    );
    await pinMenuItem.click();
    await responsePromise;

    await page.getByTestId('projects-projects').waitFor();
    expect(newAiChatCopy.getByLabel('Pin')).toBeVisible();

    await deleteOneProject({ page, project: newAiChatCopy });
  });

  test('import project from git', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Import' }).click();
    await page.getByText('Git Repo').click();
    const input = page.getByPlaceholder('https://github.com/aigne/example.git');
    const importPromise = page.waitForResponse(
      (response) => response.url().includes('/api/projects/import') && response.status() === 200
    );
    await input.click();
    await input.fill('https://github.com/AIGNE-io/aigne-rpg-demo.git');
    await page.getByRole('button', { name: 'Import from git repo' }).click();
    await importPromise;
  });

  test('import project from did space', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // 得到当前身份
    await page.getByLabel('User info button').click();
    const passport = await page.locator('div[data-cy="sessionManager-switch-passport-trigger"] span').innerText();

    // 先同步 did space 数据
    await page
      .getByTestId('projects-projects')
      .locator('>div')
      .filter({ hasText: 'Test Project' })
      .click({ force: true });
    await page.waitForSelector('span[aria-label="Import Agents"]');
    await page.getByTestId('header-actions-setting').click();
    await page.getByRole('tab', { name: 'DID Spaces' }).click();
    await page.getByLabel('Auto sync when saving').check();
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/remote/sync') && response.status() === 200
    );
    await page.getByRole('button', { name: 'Sync' }).click();
    await responsePromise;

    await page.waitForTimeout(1000);
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Import' }).click();
    await page.getByText('DID Spaces').click();
    await page.getByText('Import a project from the currently connected DID Space').click();

    await login({
      page,
      wallet: ensureWallet({ name: passport.trim() }),
    });

    // 拉取 did space 数据
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForSelector('div:has-text("Import project from DID Spaces")');

    while (!(await page.getByRole('listbox').isVisible())) {
      await page.getByPlaceholder('Select a project to import').click({ force: true });
      await page.waitForTimeout(500);
    }

    await page.getByRole('option', { name: 'Test Project' }).first().click();
    await page.getByRole('button', { name: 'Import from DID Spaces' }).click();
  });
});
