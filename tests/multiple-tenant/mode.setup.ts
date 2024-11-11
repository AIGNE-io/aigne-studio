import { login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';

import customSetup from '../utils/base';
import { TestConstants } from '../utils/constants';
import { checkTenantMode } from '../utils/tenant';

customSetup('multiple tenant mode', async ({ page, appName }) => {
  await page.goto('/');

  await login({
    page,
    wallet: ensureWallet({ name: 'owner' }),
    appWallet: ensureWallet({ name: appName, onlyFromCache: true }),
    passport: { name: 'owner', title: 'owner' },
  });

  await page.context().storageState({ path: TestConstants.authFilePath('owner') });

  await checkTenantMode({ page, isSingle: false, openPricePlan: true });

  await page.getByLabel('User info button').click();
  await page.getByRole('menuitem', { name: 'Sign Out' }).click();
  await page.waitForLoadState('networkidle');
});
