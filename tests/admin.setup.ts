import { login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';
import { test as setup } from '@playwright/test';

import { deleteCategory } from './utils/category';
import { TestConstants } from './utils/constants';
import { deleteDeploy } from './utils/deploy';
import { deleteProject } from './utils/project';

setup('admin authenticate', async ({ page }) => {
  await page.goto('/');

  await login({
    page,
    wallet: ensureWallet({ name: 'admin' }),
    appWallet: ensureWallet({ name: process.env.TEST_BLOCKLET_APP_NAME, onlyFromCache: true }),
    passport: { name: 'admin', title: 'admin' },
  });

  await page.context().storageState({ path: TestConstants.authFilePath('admin') });

  await deleteProject({ page });
  await deleteCategory({ page });
  await deleteDeploy({ page });
});
