import { login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';
import { test as setup } from '@playwright/test';

import { deleteCategory } from './utils/category';
import { TestConstants } from './utils/constants';
import { deleteDeploy } from './utils/deploy';
import { deleteProject } from './utils/project';

setup('owner authenticate', async ({ page }) => {
  await page.goto('/');

  await login({
    page,
    wallet: ensureWallet({ name: 'owner' }),
    appWallet: ensureWallet({ name: process.env.TEST_BLOCKLET_APP_NAME, onlyFromCache: true }),
    passport: { name: 'owner', title: 'owner' },
  });

  await page.context().storageState({ path: TestConstants.authFilePath('owner') });

  await deleteProject({ page });
  await deleteCategory({ page });
  await deleteDeploy({ page });
});
