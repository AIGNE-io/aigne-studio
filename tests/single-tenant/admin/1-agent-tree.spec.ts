import { Page, expect, test } from '@playwright/test';

import { createProject, deleteProject } from '../../utils/project';

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

let projectUrl: string;

test.beforeAll('clean and create project', async ({ browser }) => {
  const page = await browser.newPage();
  await deleteProject({ page });
  await createProject({ page });
  projectUrl = page.url();
});

test.beforeEach(async ({ page }) => {
  await page.goto(projectUrl);
  await page.waitForLoadState('networkidle');
});

test('create agent', async ({ page }) => {
  await deleteAllFoldersAndAgents({ page });
  await page.getByLabel('New Agent').getByRole('button').click({ force: true });

  const firstAgent = page.locator('.agent-box').first();
  await firstAgent.press('Enter');
  await firstAgent.hover();
  await firstAgent.getByTestId('tree-item-actions-button').first().click();
  await expect(page.getByText('Duplicate')).toBeVisible();
  await page.getByText('Duplicate').click({ force: true });
});

test('new folder/rename / new agent', async ({ page }) => {
  const folders = page.locator('.file-tree-folder');
  const folderCount = await folders.count();
  await page.getByLabel('New Group').getByRole('button').click({ force: true });
  await page.getByRole('listitem').locator('input').waitFor();
  const newFolderCount = await folders.count();
  expect(newFolderCount).toBe(folderCount + 1);

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
  await page.getByTestId('agent-name').locator('input[placeholder="Unnamed"]').waitFor();
});
