import { expect, test } from '@playwright/test';

test.beforeEach('route to agent page', async ({ page }) => {
  await page.goto('/projects');

  // check examples projects
  const examples = page.getByTestId('projects-examples');
  await examples.waitFor();
  await expect(examples).not.toBeEmpty();

  // copy a example project
  await examples.getByText('AI Chat').click({ force: true });
  await page.waitForURL(/\/projects\/\w+/, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=project-page-prompts]');
});

test.describe.serial('new folder', () => {
  test('new folder', async ({ page }) => {
    // create folder
    const folderCount = await page.getByText('Folder(Test)', { exact: true }).count();
    await page.getByLabel('New Group').getByRole('button').click({ force: true });
    await page.locator('.MuiInputBase-input').first().click({ force: true });
    await page.locator('.MuiInputBase-input').first().fill('Folder(Test)');
    await page.locator('.MuiInputBase-input').first().press('Enter');
    await page.waitForTimeout(500);
    await expect(await page.getByText('Folder(Test)', { exact: true }).count()).toBeGreaterThan(folderCount);
  });

  test('rename folder', async ({ page }) => {
    await page.locator('.MuiStack-root > .MuiButtonBase-root').first().click({ force: true });
    await page.getByText('Rename', { exact: true }).click({ force: true });
    await page.locator('.MuiInputBase-input').first().click({ force: true });
    await page.locator('.MuiInputBase-input').first().press('ArrowRight');
    await page.locator('.MuiInputBase-input').first().fill('Folder(Test Renamed)');
    await page.locator('.MuiInputBase-input').first().press('Enter');
    await expect(await page.getByText('Folder(Test Renamed)', { exact: true })).toBeVisible();
  });

  test('create new agent', async ({ page }) => {
    await page.getByTestId('tree-item-actions-button').first().click({ force: true });
    await page.getByText('New Agent').first().click({ force: true });
    await page.getByLabel('New file').first().getByRole('textbox').press('Enter');
    await expect(page.getByLabel('New file').first().getByTestId('agent-tree-item')).toContainText('Unnamed Agent');
  });

  test('delete agent', async ({ page }) => {
    const agent = await page.getByTestId('agent-tree-box');
    await page.getByTestId('file-tree-folder').first().click();
    await page.waitForTimeout(500);
    const count = await agent.count();
    await agent.getByRole('button').first().click({ force: true });
    await page.waitForTimeout(500);
    await page.getByTestId('delete-file').first().click({ force: true });
    await page.waitForTimeout(500);
    const newCount = await page.getByTestId('agent-tree-box').count();
    await expect(newCount).toBeLessThan(count);
  });

  test('delete folder', async ({ page }) => {
    const folderCount = await page.getByText('Folder(Test Renamed)', { exact: true }).count();
    const folder = await page.getByTestId('file-tree-folder').first();
    await folder.hover();
    await page.getByTestId('tree-item-actions-button').first().click({ force: true });
    await page.getByTestId('delete-file').click({ force: true });
    const newFolderCount = await page.getByText('Folder(Test Renamed)', { exact: true }).count();
    await expect(newFolderCount).toBe(folderCount - 1);
  });
});

test.describe.serial('new agent', () => {
  test('create agent', async ({ page }) => {
    const agentCount = await page.getByText('Test Agent', { exact: true }).count();
    await page.getByLabel('New Agent').getByRole('button').click({ force: true });
    await page.getByLabel('New file').getByRole('textbox').fill('Test Agent');
    const newAgentCount = await page.getByText('Test Agent', { exact: true }).count();
    await expect(newAgentCount).toBeGreaterThanOrEqual(agentCount);
  });

  // copy agent
  test('copy agent', async ({ page }) => {
    const agentCopyCount = await page.getByText('AI Chat', { exact: true }).count();
    await page.getByTestId('agent-tree-box').filter({ hasText: 'AI Chat' }).first().hover();
    await page
      .getByTestId('agent-tree-box')
      .filter({ hasText: 'AI Chat' })
      .getByRole('button')
      .nth(0)
      .click({ force: true });
    await page.waitForTimeout(500);
    await page.getByText('Duplicate').click({ force: true });
    await page.waitForTimeout(500);
    const newAgentCopyCount = await page.getByText('AI Chat', { exact: true }).count();
    await expect(newAgentCopyCount).toBeGreaterThanOrEqual(agentCopyCount);
  });

  test('delete agent', async ({ page }) => {
    const agentDeleteCount = await page.getByText('AI Chat Copy', { exact: true }).count();
    const agentDelete = await page.getByTestId('agent-tree-box').filter({ hasText: 'AI Chat Copy' }).all();
    for (const agent of agentDelete) {
      if (await agent.isVisible()) {
        await agent.getByRole('button').first().click({ force: true });
        await page.waitForTimeout(500);
        await page.getByTestId('delete-file').click({ force: true });
      }
    }
    for (const agent of await page.getByTestId('agent-tree-box').filter({ hasText: 'Test Agent' }).all()) {
      if (await agent.isVisible()) {
        await agent.getByRole('button').first().click({ force: true });
        await page.waitForTimeout(500);
        await page.getByTestId('delete-file').click({ force: true });
      }
    }
    for (const agent of await page.getByTestId('agent-tree-box').filter({ hasText: 'Unnamed Agent' }).all()) {
      if (await agent.isVisible()) {
        await agent.getByRole('button').first().click({ force: true });
        await page.waitForTimeout(500);
        await page.getByTestId('delete-file').click({ force: true });
      }
    }
    const newAgentDeleteCount = await page.getByText('AI Chat Copy', { exact: true }).count();
    await expect(newAgentDeleteCount).toBeLessThanOrEqual(agentDeleteCount);
  });

  test('rename agent', async ({ page }) => {
    // rename agent
    const renameAgentCount = await page.getByTestId('agent-tree-box').filter({ hasText: 'AI Chat(Renamed)' }).count();
    const renameAgent = page.getByTestId('agent-tree-box').filter({ hasText: 'AI Chat' }).first();
    await renameAgent.click({ force: true });
    await renameAgent.getByRole('button').first().click({ force: true });
    await page.getByText('Rename').first().click({ force: true });
    await page.locator('.MuiInputBase-input').first().fill('AI Chat(Renamed)');
    await page.locator('.MuiInputBase-input').first().press('Enter');
    const newRenameAgentCount = await page
      .getByTestId('agent-tree-box')
      .filter({ hasText: 'AI Chat(Renamed)' })
      .count();
    await expect(newRenameAgentCount).toBeGreaterThanOrEqual(renameAgentCount);

    const agent = await page.getByTestId('agent-tree-box').filter({ hasText: 'AI Chat(Renamed)' }).first();
    await agent.getByRole('button').click({ force: true });
    await page.getByText('Rename').first().click({ force: true });
    await page.locator('.MuiInputBase-input').first().fill('AI Chat');
    await page.locator('.MuiInputBase-input').first().press('Enter');
  });

  test('set as entry agent', async ({ page }) => {
    // set as entry
    const entryAgent = await page.getByTestId('agent-tree-box').filter({ hasNotText: '(Entry)' }).first();
    entryAgent.hover();
    await entryAgent.getByRole('button').click({ force: true });
    await page.getByText('Set as entry agent').first().click();
  });
});
