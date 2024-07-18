import { expect, test } from '@playwright/test';

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

    await page.getByRole('menuitem', { name: 'Copy to My Projects' }).click();
    await page.waitForResponse((response) => response.url().includes('/api/projects') && response.status() === 200);

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
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForResponse((response) => response.url().includes('/api/projects') && response.status() === 200, {});
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

    await pinMenuItem.click();
    await page.waitForResponse((response) => response.url().includes('/api/projects') && response.status() === 200, {});
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

    console.log('text', text);

    const match = (text || '').match(/"([^"]*)"/);
    console.log('text22', match);
    if (match && match[1]) {
      await page.getByLabel('Please input ').click();
      await page.getByLabel('Please input ').fill(match[1]);
      await page.getByRole('button', { name: 'Delete' }).click();
    }

    await page.waitForResponse((response) => response.url().includes('/api/projects') && response.status() === 200, {});
  });
});
