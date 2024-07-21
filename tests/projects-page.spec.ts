import { login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';
import { expect, test } from '@playwright/test';

test.beforeEach('route to agent page', async ({ page }) => {
  await page.goto('/projects');

  // check examples projects
  const examples = page.getByTestId('projects-examples');
  await examples.waitFor();
  await expect(examples).not.toBeEmpty();
});

test('has example projects', async ({ page }) => {
  await page.goto('/projects');

  const examples = page.getByTestId('projects-examples');
  await examples.waitFor();

  await expect(examples).not.toBeEmpty();

  const test = await page.getByTestId('projects-projects-item');
  const count = await test.count();
  console.log(count);
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

// 复制项目
test.describe.serial('handle project', () => {
  test('copy project', async ({ page }) => {
    await page.goto('/projects');

    await page.getByTestId('projects-examples').waitFor();
    await expect(page.getByTestId('projects-examples')).toContainText('AI Chat');

    const aiChatExample = await page.getByTestId('projects-examples').locator('div').filter({ hasText: 'AI Chat' });

    const projectCount = await page.getByTestId('projects-projects').getByText('AI Chat').count();
    await aiChatExample.first().hover();
    await aiChatExample.getByRole('button').click();

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/projects') && response.status() === 200
    );
    await page.getByRole('menuitem', { name: 'Copy to My Projects' }).click();
    await responsePromise;

    await expect(page.getByTestId('projects-projects')).toContainText('AI Chat Copy');
    const newProjectCount = await page.getByTestId('projects-projects').getByText('AI Chat').count();
    await expect(newProjectCount).toBeGreaterThanOrEqual(projectCount + 1);
  });

  test('edit project', async ({ page }) => {
    await page.goto('/projects');

    await page.getByTestId('projects-examples').waitFor();
    await expect(page.getByTestId('projects-examples')).toContainText('AI Chat');

    const aiChatCopy = page.getByTestId('projects-projects').locator('div').filter({ hasText: 'AI Chat Copy' }).first();
    // 编辑
    await aiChatCopy.hover();
    await aiChatCopy.getByRole('button').click();

    const editMenuItem = page.getByRole('menuitem', { name: 'Edit' });
    await expect(editMenuItem).toBeVisible();

    await editMenuItem.click();
    await expect(page.getByText('Edit Project')).toBeVisible();

    await page.getByLabel('Project name').click();
    await page.getByLabel('Project name').fill('AI Chat Copy Edit');
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/projects') && response.status() === 200,
      {}
    );
    await page.getByRole('button', { name: 'Save' }).click();
    await responsePromise;
    await expect(page.getByTestId('projects-projects')).toContainText('AI Chat Copy Edit');
  });

  // pin/unpin
  test('pin project', async ({ page }) => {
    await page.goto('/projects');

    await page.getByTestId('projects-examples').waitFor();
    await expect(page.getByTestId('projects-examples')).toContainText('AI Chat');

    const aiChatCopy = page
      .getByTestId('projects-projects-item')
      .locator('div')
      .filter({ hasText: 'AI Chat Copy' })
      .first();
    await expect(aiChatCopy).toBeVisible();

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
  });

  test('delete project', async ({ page }) => {
    await page.goto('/projects');

    await page.getByTestId('projects-examples').waitFor();
    await expect(page.getByTestId('projects-examples')).toContainText('AI Chat');

    const deleteTarget = page.getByTestId('projects-projects').locator('div').first();
    await expect(deleteTarget).toBeVisible();

    // 删除
    await deleteTarget.hover();
    await deleteTarget.getByRole('button').click();
    const deleteMenuItem = page.getByRole('menuitem', { name: 'Delete' });
    await expect(deleteMenuItem).toBeVisible();

    await deleteMenuItem.click();
    const element = await page.getByText('This will permanently delete');
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
  });
});

// todo: 重复项目导入
test('import project from git', async ({ page }) => {
  // 如果存在先删除
  const projects = await page.locator('.projects-projects-item').getByText('Multi-Characters RPG').all();
  console.log(projects, projects.length);
  console.log(
    await page.locator('.projects-projects-item').all(),
    (await page.locator('.projects-projects-item').all()).length
  );
  console.log(
    await page.getByTestId('projects-projects-item').all(),
    (await page.getByTestId('projects-projects-item').all()).length
  );
  if (projects.length > 0) {
    for (let i = projects.length - 1; i >= 0; i++) {
      await page.getByTestId('projects-projects-item').getByRole('button').click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();
      const element = await page.getByText('This will permanently delete');
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

// todo: 找不到did space 中的项目
test('import project from did space', async ({ page }) => {
  await page.getByRole('button', { name: 'Import' }).click();
  await page.getByText('DID Spaces').click();
  await page.getByText('Import a project from the').click();

  await login({
    page,
    wallet: ensureWallet({ name: 'owner' }),
  });

  // from-did-spaces/import-project
  const importPromise = page.waitForResponse(
    (response) => response.url().includes('/from-did-spaces/import-project') && response.status() === 200
  );
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForSelector('div:has-text("Import project from DID Spaces")');
  await page.getByPlaceholder('Select a project to import').click({ force: true });
  await page.getByRole('option', { name: 'AI Chat' }).click();
  await page.getByRole('button', { name: 'Import from DID Spaces' }).click();
  await importPromise;
});
