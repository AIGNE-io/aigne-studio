#!/usr/bin/env -S node -r ts-node/register

import { getBlockletServerStatus, removeTestApp } from '@blocklet/testlab/utils/server';
import { didToDomain, ensureWallet } from '@blocklet/testlab/utils/wallet';
import { $, argv } from 'zx';

import { setupUsers } from '../tests/utils/auth';

function toCamelCase(str: string) {
  const withoutExtension = str.replace(/\.[^/.]+$/, '');

  return withoutExtension
    .split(/[-_]/)
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

const ui = argv.ui;
if (ui) process.env.HEADLESS = 'false';

const blockletCli = process.env.BLOCKLET_CLI || 'blocklet';

(async () => {
  const playwrightConfig = {
    single: 'playwright-single-tenant-mode.config.ts',
    multiple: 'playwright-multiple-tenant-mode.config.ts',
  };

  const configFile = playwrightConfig[argv.config as keyof typeof playwrightConfig] || playwrightConfig.single;
  const appName = toCamelCase(`${configFile.replace('playwright-', '').replace('.config.ts', '')}-app`);

  const appWallet = ensureWallet({ name: appName, onlyFromCache: true });

  const info = await getBlockletServerStatus();
  if (!info) throw new Error('Blocklet server is not running');
  console.log('info', info);

  const appUrl = didToDomain({ did: appWallet.address, port: info.httpsPort });
  console.log('appUrl', appUrl);

  await setupUsers({ appName, appUrl });
  process.env.PW_TEST_HTML_REPORT_OPEN = 'never';

  await $`TEST_BLOCKLET_APP_URL=${appUrl} TEST_BLOCKLET_APP_NAME=${appName} playwright test ${ui ? '--ui' : ''} --config=${configFile}`;

  await removeTestApp({ blockletCli, appSk: appWallet.secretKey });
})();
