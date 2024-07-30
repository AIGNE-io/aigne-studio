import { login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';
import { expect, test } from '@playwright/test';

import { deleteProject } from './utils/project';

test.beforeEach('route to agent page', async ({ page }) => {
  await page.goto('/projects');
  await deleteProject({ page });
  const examples = page.getByTestId('projects-examples');
  await examples.waitFor();
  await expect(examples).not.toBeEmpty();
});

// 复制项目
test.describe.serial('handle project', () => {
  test('has example projects', async ({ page }) => {
    await page.goto('/projects');

    const examples = page.getByTestId('projects-examples');
    await examples.waitFor();

    // 获取所有匹配的 div 元素
    const elements = page.getByTestId('projects-examples').locator('.name');
    // 获取所有文本内容
    const texts = await elements.allTextContents();
    // 预期的文本值
    const expectedTexts = ['AI Chat', 'Email Generator', 'Image Generator'];
    // 检查所有预期的文本值是否都存在
    for (const expectedText of expectedTexts) {
      expect(texts).toContain(expectedText);
    }
  });

  test('copy/edit project', async ({ page }) => {
    const aiChatExample = await page.getByTestId('projects-examples').locator('>div').filter({ hasText: 'AI Chat' });
    await aiChatExample.hover();
    await aiChatExample.getByRole('button').click();

    const copyProjectPromise = page.waitForResponse(
      (response) => response.url().includes('/api/projects') && response.status() === 200
    );
    await page.getByRole('menuitem', { name: 'Copy to My Projects' }).click();
    await copyProjectPromise;

    const projects = page.getByTestId('projects-projects');
    await expect(projects).toContainText('AI Chat Copy');
    const newProjectCount = await projects.getByText('AI Chat').count();
    expect(newProjectCount).toBe(1);

    const aiChatCopy = await projects.locator('>div').filter({ hasText: 'AI Chat Copy' }).first();
    await aiChatCopy.hover();
    await aiChatCopy.getByRole('button').click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await page.getByLabel('Project name').fill('AI Chat Copy Edit');
    const aiChatCopyPromise = page.waitForResponse(
      (response) => response.url().includes('/api/projects') && response.status() === 200
    );
    await page.getByRole('button', { name: 'Save' }).click();
    await aiChatCopyPromise;
    await expect(aiChatCopy.locator('.name')).toHaveText('AI Chat Copy Edit');

    await aiChatCopy.hover();
    await aiChatCopy.getByRole('button').click();
    const pinMenuItem = page.getByRole('menuitem', { name: 'Pin' });
    await expect(pinMenuItem).toBeVisible();

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/projects') && response.status() === 200,
      {}
    );
    await pinMenuItem.click();
    await responsePromise;
    expect(aiChatCopy.getByLabel('Pin')).toBeVisible();
  });

  test('import project from git', async ({ page }) => {
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
    // 得到当前身份
    await page.getByLabel('User info button').click();
    const passport = await page.locator('div[data-cy="sessionManager-switch-passport-trigger"] span').innerText();

    // 找到 ai chat 项目
    await page.getByTestId('projects-examples').locator('>div').filter({ hasText: 'AI Chat' }).click();
    await page.waitForSelector('span[aria-label="Import Agents"]');

    await page.getByTestId('header-actions-setting').click();
    await page.getByRole('tab', { name: 'DID Spaces' }).click();
    await page.getByLabel('Auto sync when saving').check();
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/remote/sync') && response.status() === 200
    );
    await page.getByRole('button', { name: 'Sync' }).click();
    await responsePromise;

    await page.goto('/projects');
    await page.getByTestId('projects-examples').waitFor();
    await page.getByRole('button', { name: 'Import' }).click();
    await page.getByText('DID Spaces').click();
    await page.getByText('Import a project from the currently connected DID Space').click();

    await login({
      page,
      wallet: ensureWallet({ name: passport.trim() }),
    });

    // from-did-spaces/import-project
    const importPromise = page.waitForResponse(
      (response) => response.url().includes('/from-did-spaces/import-project') && response.status() === 200
    );
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForSelector('div:has-text("Import project from DID Spaces")');

    while (!(await page.getByRole('listbox').isVisible())) {
      await page.getByPlaceholder('Select a project to import').click({ force: true });
      await page.waitForTimeout(500);
    }
    await page.getByRole('option', { name: 'AI Chat' }).first().click();
    await page.getByRole('button', { name: 'Import from DID Spaces' }).click();
    await importPromise;
  });
});
