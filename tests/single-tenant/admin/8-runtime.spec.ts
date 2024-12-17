// import { login } from '@blocklet/testlab/utils/playwright';
// import { ensureWallet } from '@blocklet/testlab/utils/wallet';
import { expect, test } from '@playwright/test';

import { installBlocklet } from '../../utils/uninstall';

const secretKey = 'f712dac84b4f84c3c2fa079896572ed19e2738e23baf025f2c8764d5d8598deb';

test.describe.serial('resource blocklet', () => {
  test.beforeEach('route to blocklets', async ({ page }) => {
    await page.goto('.well-known/service/admin/overview');
    await page.waitForSelector('h6.page-title');
    await page.locator("button span:has-text('Blocklets')").click();
    await page.waitForSelector('button:has-text("Add Blocklet")');
  });

  test.describe.configure({ retries: 3 });

  test('init', async ({ page }) => {
    await page.waitForTimeout(5000);

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('User info button').click();
    await page.getByRole('menuitem', { name: 'Dashboard' }).click();
    await page.locator('h6.page-title').waitFor();
    await page.locator("button span:has-text('Blocklets')").click();
    await page.locator('button:has-text("Add Blocklet")').waitFor();

    const blocklet = page.locator('.component-name').filter({ hasText: 'Mockplexity' });
    if ((await blocklet.count()) === 0) {
      await installBlocklet(page);
      // } else {
      //   const loginParams = {
      //     page,
      //     wallet: ensureWallet({ name: 'owner' }),
      //     appWallet: ensureWallet({ name: 'single-tenant-mode-app', onlyFromCache: true }),
      //     passport: { name: 'owner', title: 'owner' },
      //     popup: false,
      //   };

      //   await unInstallBlocklet(page, 'Mockplexity');
      //   await login(loginParams);
    }
  });

  test('open resource blocklet', async ({ page }) => {
    const blocklet = page.locator('.component-item').filter({ hasText: 'Mockplexity' }).first();
    const stopIcon = blocklet.getByTestId('StopIcon');
    if ((await stopIcon.count()) > 0) return;

    const startIcon = blocklet.getByTestId('PlayArrowIcon');
    if ((await startIcon.count()) > 0) {
      await startIcon.click();
      await blocklet.getByTestId('StopIcon').waitFor();
    }

    await blocklet.locator('span:has-text("Running")').waitFor();
  });

  test('open SerpApi blocklet', async ({ page }) => {
    const serpApi = page.locator('.component-item').filter({ hasText: 'SerpApi' });

    const stopIcon = serpApi.getByTestId('StopIcon');
    const isRunning = serpApi.locator('span:has-text("Running")');

    if ((await stopIcon.count()) && !(await isRunning.count())) {
      await serpApi.getByTestId('StopIcon').click();
      await page.getByTestId('submit-confirm-dialog').click();
      await serpApi.getByTestId('PlayArrowIcon').click();
    }
  });

  test('set agent secrets', async ({ page }) => {
    test.slow();
    await page.waitForTimeout(5000);
    await page.goto('/mockplexity/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('aigne-runtime-header-menu-button').click({ timeout: 120000 });
    await page.getByRole('menuitem', { name: 'Settings' }).click();
    const agentSecrets = page.locator('input');
    await agentSecrets.click();
    await agentSecrets.fill(secretKey);
    await page.locator('button:has-text("Save")').click();
  });

  test('clear session', async ({ page }) => {
    await page.goto('/mockplexity/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('aigne-runtime-header-menu-button').click({ timeout: 120000 });
    await page.getByRole('menuitem', { name: 'Clear Session' }).click();

    const message = await page.locator('.message-item').all();
    expect(message.length).toBe(0);
  });

  // test('start resource knowledge blocklet', async ({ page }) => {
  //   await unInstallBlocklet(page, '新版本知识库');
  //   await installBlockletResourceKnowledgeBlocklet(page);
  //   await page.waitForTimeout(5000);

  //   const blocklet = page.locator('.component-item').filter({ hasText: '新版本知识库' }).first();

  //   const isRunning = (await blocklet.getByTestId('StopIcon').count()) > 0;
  //   if (!isRunning) {
  //     await blocklet.getByTestId('PlayArrowIcon').click();
  //     await blocklet.getByTestId('StopIcon').waitFor();
  //   }
  // });

  // test('resource knowledge blocklet', async ({ page }) => {
  //   await page.goto('/projects');
  //   await page.waitForLoadState('networkidle');

  //   await createProject({ page });
  //   await page.waitForLoadState('networkidle');

  //   await page.getByTestId('project-page-knowledge').click();
  //   await page.getByText('新版本知识库').first().click();
  //   await expect(page.getByText('Add Document')).not.toBeVisible();
  //   await expect(page.getByText('Actions')).not.toBeVisible();
  // });
});
