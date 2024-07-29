import { Page, expect, test } from '@playwright/test';

import { createProject, deleteProject } from './utils/project';

const deleteAllFoldersAndAgents = async ({ page }: { page: Page }) => {
  // 1. 找到所有的 folder
  const listItems = page.getByTestId('file-tree').locator('> div[role="list"] > div[role="listitem"]');
  let length = await listItems.count();

  while (length > 0) {
    const listItem = listItems.first();
    // 判断这个 listItem 是否是 folder
    const isFolder = (await listItem!.locator('iconify-icon.file-tree-folder-icon').count()) > 0;
    if (isFolder) {
      const firstFolder = listItem.locator('>div').first();
      await firstFolder.hover();
      await firstFolder.locator('button').click();
      await page.locator('div[role="tooltip"]').getByText('Delete').click();
    } else {
      await listItem.locator('>div>div').hover();
      await listItem.locator('button').click();
      await page.locator('div[role="tooltip"]').getByText('Delete').click();
    }

    length = await listItems.count();
  }
};

test.beforeEach('route to agent page', async ({ page }) => {
  test.slow();
  // await deleteProject({ page });
  await createProject({ page });
});

test.describe.serial('folder', () => {
  test('delete all folders', async ({ page }) => {
    await deleteAllFoldersAndAgents({ page });
  });

  test('new folder / rename / new agent', async ({ page }) => {
    // todo: 为了进行下面的测试用例, #1251 修复后删除
    const agentCount = await page.getByTestId('agent-box').count();
    if (agentCount === 0) {
      await page.getByLabel('New Agent').getByRole('button').click({ force: true });
    }
    // ----
    const folders = page.locator('.file-tree-folder');
    const folderCount = await folders.count();
    await page.getByLabel('New Group').getByRole('button').click({ force: true });
    const newFolderCount = await folders.count();
    await expect(newFolderCount).toBe(folderCount + 1);

    const folder = page.locator('.file-tree-folder').first();
    await folder.locator('..').hover();
    await folder.locator('..').locator('button').click();
    await page.locator('div[role="tooltip"]').getByText('Rename').click();
    await folder.getByRole('textbox').fill('Folder(Test Renamed)');
    await folder.getByRole('textbox').press('Enter');
    await expect(page.getByText('Folder(Test Renamed)', { exact: true })).toBeVisible();

    await folder.locator('..').hover();
    await folder.locator('..').locator('button').click();
    await page.locator('div[role="tooltip"]').getByText('New Agent').click();
    const newAgentsCount = await folder
      .locator('..')
      .locator('..')
      .locator('div[role="list"]')
      .locator('div[role="listitem"]')
      .count();
    await expect(newAgentsCount).toBe(1);
  });
});

test('create agent', async ({ page }) => {
  await deleteAllFoldersAndAgents({ page });
  await page.getByLabel('New Agent').getByRole('button').click({ force: true });
  await expect(await page.locator('.agent-box').count()).toBe(1);

  const firstAgent = page.locator('.agent-box').first();
  await firstAgent.press('Enter');
  await firstAgent.locator('> div').hover();
  await firstAgent.locator('button').click();
  await page.getByText('Duplicate').click({ force: true });
  await expect(await page.locator('.agent-box').count()).toBe(2);

  const duplicateAgent = page.locator('.agent-box').last();
  await duplicateAgent.press('Enter');
  await duplicateAgent.locator('> div').hover();
  await duplicateAgent.locator('button').click();
  await page.getByText('Rename').click({ force: true });
  await duplicateAgent.getByRole('textbox').fill('Renamed Agent');
  await duplicateAgent.press('Enter');
  await expect(firstAgent).toContainText('Renamed Agent');

  await firstAgent.locator('> div').hover();
  await firstAgent.locator('button').click();
  await page.getByText('Set as entry agent').click({ force: true });
  await expect(firstAgent).toContainText('(Entry)');
});
