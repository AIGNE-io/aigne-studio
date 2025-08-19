import { test } from '@playwright/test';

import { playwrightConfigAppNames } from './utils';
import { setupUsers } from './utils/auth';

const singleAppUrl = process.env.SINGLE_TENANT_APP_URL!;
const multipleAppUrl = process.env.MULTIPLE_TENANT_APP_URL!;
const rootSeed = process.env.ROOT_SEED!;

test('initialize single-tenant-mode-app', async () => {
  await setupUsers({ appName: playwrightConfigAppNames.single, appUrl: singleAppUrl, rootSeed });
});

test('initialize multiple-tenant-mode-app', async () => {
  await setupUsers({ appName: playwrightConfigAppNames.multiple, appUrl: multipleAppUrl, rootSeed });
});
