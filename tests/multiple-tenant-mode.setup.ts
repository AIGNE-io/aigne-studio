import { login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';
import { test as setup } from '@playwright/test';

import { TestConstants } from './utils/constants';
import { checkTenantMode } from './utils/tenant';

setup('multiple tenant mode', async ({ page }) => {
  await page.goto('/');

  // await login({
  //   page,
  //   wallet: ensureWallet({ name: 'owner' }),
  //   appWallet: ensureWallet({ name: 'app', onlyFromCache: true }),
  //   passport: { name: 'owner', title: 'owner' },
  // });

  // await page.context().storageState({ path: TestConstants.authFilePath('owner') });

  // await checkTenantMode({ page, isSingle: false });

  // await page.getByLabel('User info button').click();
  // await page.getByRole('menuitem', { name: 'Sign Out' }).click();
  // await page.waitForLoadState('networkidle');
});
