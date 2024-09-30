import { login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';
import { test as setup } from '@playwright/test';

import { TestConstants } from './utils/constants';
import { logout } from './utils/logout';

setup('guest authenticate', async ({ page }) => {
  await logout({ page });

  await page.goto('/');

  await login({
    page,
    wallet: ensureWallet({ name: 'guest' }),
    appWallet: ensureWallet({ name: 'app', onlyFromCache: true }),
    passport: { name: 'guest', title: 'guest' },
  });

  await page.context().storageState({ path: TestConstants.authFilePath('guest') });
});
