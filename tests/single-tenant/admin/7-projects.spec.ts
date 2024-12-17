// import { login } from '@blocklet/testlab/utils/playwright';
// import { ensureWallet } from '@blocklet/testlab/utils/wallet';
import { test } from '@playwright/test';

import { createProject } from '../../utils/project';

test.beforeEach('clean and create project', async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');

  await createProject({ page });
});

test.describe.serial('projects', () => {
  test('import project from git', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Import' }).click();
    await page.getByText('Git Repo').click();
    const input = page.getByPlaceholder('https://github.com/aigne/example.git');
    const importPromise = page.waitForResponse((response) => response.url().includes('/api/projects/import'));
    await input.click();
    await input.fill('https://github.com/AIGNE-io/aigne-rpg-demo.git');
    await page.getByPlaceholder('Let your project shine with a unique name').fill('example');
    await page.getByRole('button', { name: 'Import from git repo' }).click();
    await importPromise;
  });

  test('import project from did space', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // 得到当前身份
    await page.getByLabel('User info button').click();

    // 先同步 did space 数据
    await page
      .getByTestId('projects-projects')
      .locator('>div')
      .filter({ hasText: 'Test Project' })
      .first()
      .click({ force: true });
    await page.waitForSelector('span[aria-label="Import Agents"]');
    await page.getByTestId('header-actions-setting').click();
    await page.getByRole('tab', { name: 'DID Spaces' }).click();
    await page.getByLabel('Auto sync when saving').check();
    const responsePromise = page.waitForResponse((response) => response.url().includes('/api/projects/'));
    await page.getByText('Auto sync when saving').click();
    await responsePromise;

    // await page.goto('/projects');
    // await page.waitForLoadState('networkidle', { timeout: 20000 });

    // await page.getByRole('button', { name: 'Import' }).click();
    // await page.getByText('DID Spaces').click();
    // await page.getByText('Import a project from the currently connected DID Space').click();

    // 这里单独分支处理
    // await login({
    //   page,
    //   wallet: ensureWallet({ name: passport.trim() }),
    // });

    // // 拉取 did space 数据
    // await page.getByRole('button', { name: 'Next' }).click();
    // await page.waitForSelector('div:has-text("Import project from DID Spaces")');

    // while (!(await page.getByRole('listbox').isVisible())) {
    //   await page.getByPlaceholder('Select a project to import').click({ force: true });
    // }

    // await page.getByRole('option', { name: 'Test Project' }).first().click();
    // await page.getByRole('button', { name: 'Import from DID Spaces' }).click();
  });
});
