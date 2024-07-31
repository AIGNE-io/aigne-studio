import { login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';
import { test as setup } from '@playwright/test';

import { TestConstants } from './utils/constants';
import { unInstallBlocklet } from './utils/uninstall';

setup('admin authenticate', async ({ page }) => {
  await page.goto('/');

  await login({
    page,
    wallet: ensureWallet({ name: 'admin' }),
    appWallet: ensureWallet({ name: 'app', onlyFromCache: true }),
    passport: { name: 'admin', title: 'admin' },
  });

  await page.context().storageState({ path: TestConstants.authFilePath('admin') });

  await page.goto('/projects');
  await page.getByLabel('User info button').click();
  await page.getByRole('menuitem', { name: 'Dashboard' }).click();
  await page.locator('h6.page-title').waitFor();
  await page.locator("button span:has-text('Blocklets')").click();
  await page.locator('button:has-text("Add Blocklet")').waitFor();

  await unInstallBlocklet(page, 'Mockplexity');
  await unInstallBlocklet(page, 'SerpApi');
});
