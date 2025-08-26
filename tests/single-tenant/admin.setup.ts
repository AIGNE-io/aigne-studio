import { login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';

import customSetup from '../utils/base';
import { deleteCategory } from '../utils/category';
import { TestConstants } from '../utils/constants';
import { deleteDeploy } from '../utils/deploy';
import { deleteProject } from '../utils/project';

customSetup('admin authenticate', async ({ page, storageStatePath, appName }) => {
  await page.goto('/');

  await login({
    page,
    wallet: ensureWallet({ name: 'admin' }),
    appWallet: ensureWallet({ name: appName, onlyFromCache: false }),
    passport: { name: 'admin', title: 'admin' },
  });

  await page.context().storageState({ path: TestConstants.authFilePath(storageStatePath) });

  await deleteProject({ page });
  await deleteCategory({ page });
  await deleteDeploy({ page });
});
