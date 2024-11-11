import { login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';

import customSetup from '../utils/base';
import { TestConstants } from '../utils/constants';
import { logout } from '../utils/logout';
import { checkTenantMode } from '../utils/tenant';
import { getOwnerWallet } from '../utils/wallet';

customSetup('single tenant mode', async ({ page, appName }) => {
  await page.goto('/');

  await login({
    page,
    wallet: getOwnerWallet(),
    appWallet: ensureWallet({ name: appName, onlyFromCache: true }),
    passport: { name: 'owner', title: 'owner' },
  });

  await page.context().storageState({ path: TestConstants.authFilePath('owner') });

  await checkTenantMode({ page });

  await logout({ page });
});
