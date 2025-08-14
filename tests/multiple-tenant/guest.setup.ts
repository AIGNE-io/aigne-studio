import { login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';

import customSetup from '../utils/base';
import { TestConstants } from '../utils/constants';
import { logout } from '../utils/logout';

customSetup('guest authenticate', async ({ page, storageStatePath, appName }) => {
  await logout({ page });

  await page.goto('/');

  await login({
    page,
    wallet: ensureWallet({ name: 'guest' }),
    appWallet: ensureWallet({ name: appName, onlyFromCache: false }),
    passport: { name: 'guest', title: 'guest' },
  });

  await page.context().storageState({ path: TestConstants.authFilePath(storageStatePath) });
});
