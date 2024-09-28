import { login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';
import { test as setup } from '@playwright/test';

import { TestConstants } from './utils/constants';

setup('admin authenticate', async ({ page }) => {
  await page.goto('/');

  // await login({
  //   page,
  //   wallet: ensureWallet({ name: 'admin' }),
  //   appWallet: ensureWallet({ name: 'app', onlyFromCache: true }),
  //   passport: { name: 'admin', title: 'admin' },
  // });

  // await page.context().storageState({ path: TestConstants.authFilePath('admin') });
});
