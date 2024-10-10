#!/usr/bin/env -S node -r ts-node/register

import { getBlockletServerStatus, removeTestApp } from '@blocklet/testlab/utils/server';
import { didToDomain, ensureWallet } from '@blocklet/testlab/utils/wallet';
import { $, argv } from 'zx';

import { playwrightConfigAppNames } from '../tests/utils';
import { setupUsers } from '../tests/utils/auth';

const ui = argv.ui;
if (ui) process.env.HEADLESS = 'false';

const blockletCli = process.env.BLOCKLET_CLI || 'blocklet';

async function cleanupApps(singleAppWallet: any, multipleAppWallet: any) {
  await Promise.all([
    removeTestApp({ blockletCli, appSk: singleAppWallet.secretKey }),
    removeTestApp({ blockletCli, appSk: multipleAppWallet.secretKey }),
  ]);
}

(async () => {
  const singleAppWallet = ensureWallet({ name: playwrightConfigAppNames.single, onlyFromCache: true });
  const multipleAppWallet = ensureWallet({ name: playwrightConfigAppNames.multiple, onlyFromCache: true });

  const info = await getBlockletServerStatus();
  if (!info) throw new Error('Blocklet server is not running');
  console.log('info', info);

  const singleAppUrl = didToDomain({ did: singleAppWallet.address, port: info.httpsPort });
  const multipleAppUrl = didToDomain({ did: multipleAppWallet.address, port: info.httpsPort });

  await setupUsers({ appName: playwrightConfigAppNames.single, appUrl: singleAppUrl });
  await setupUsers({ appName: playwrightConfigAppNames.multiple, appUrl: multipleAppUrl });
  // await Promise.all([
  //   setupUsers({ appName: playwrightConfigAppNames.single, appUrl: singleAppUrl }),
  //   setupUsers({ appName: playwrightConfigAppNames.multiple, appUrl: multipleAppUrl }),
  // ]);

  process.env.PW_TEST_HTML_REPORT_OPEN = 'never';
  await $`SINGLE_TENANT_APP_URL=${singleAppUrl} MULTIPLE_TENANT_APP_URL=${multipleAppUrl} SINGLE_TENANT_APP_NAME=${playwrightConfigAppNames.single} MULTIPLE_TENANT_APP_NAME=${playwrightConfigAppNames.multiple} playwright test ${ui ? '--ui' : ''}`;

  await cleanupApps(singleAppWallet, multipleAppWallet);
})();
