#!/usr/bin/env -S node -r ts-node/register

/* eslint-disable import/no-extraneous-dependencies,no-console */

import {
  addBlocklet,
  getBlockletServerStatus,
  initTestApp,
  removeTestApp,
  startTestApp,
} from '@blocklet/testlab/utils/server';
import { didToDomain, ensureWallet, types } from '@blocklet/testlab/utils/wallet';
import Joi from 'joi';
import { $, argv } from 'zx';

import { playwrightConfigAppNames } from '../tests/utils';
import { setupUsers } from '../tests/utils/auth';
import { getOwnerWallet } from '../tests/utils/wallet';

const skipInstall = argv['skip-install'] === true;
const { ui } = argv;
if (ui) process.env.HEADLESS = 'false';

console.info(argv, { skipInstall });

const portSchema = Joi.number<number>().integer().empty(['']);
const httpPort = (portSchema.validate(process.env.BLOCKLET_SERVER_HTTP_PORT).value as number) || 80;
const httpsPort = (portSchema.validate(process.env.BLOCKLET_SERVER_HTTPS_PORT).value as number) || 443;
const blockletCli = process.env.BLOCKLET_CLI || 'blocklet';

async function cleanupApps(singleAppWallet: any, multipleAppWallet: any) {
  await Promise.all([
    removeTestApp({ blockletCli, appSk: singleAppWallet.secretKey }),
    removeTestApp({ blockletCli, appSk: multipleAppWallet.secretKey }),
  ]);
}

const initBlocklet = async ({ appName }: { appName: string }) => {
  const serverWallet = ensureWallet({ name: 'server' });
  const ownerWallet = getOwnerWallet();
  const appWallet = ensureWallet({ name: appName, role: types.RoleType.ROLE_APPLICATION });

  await initTestApp({
    blockletCli,
    serverWallet,
    appWallet,
    ownerWallet,
    httpPort,
    httpsPort,
  });

  await addBlocklet({
    blockletCli,
    appId: appWallet.address,
    bundle: 'blocklets/ai-studio/.blocklet/bundle',
    mountPoint: '/',
  });

  // FIXME: remove next sleep after issue https://github.com/ArcBlock/blocklet-server/issues/9353 fixed
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 2000);
  });

  await addBlocklet({
    blockletCli,
    appId: appWallet.address,
    bundle: 'blocklets/ai-runtime/.blocklet/bundle',
    mountPoint: '/aigne-runtime',
  });

  await startTestApp({ blockletCli, appWallet });
};

(async () => {
  if (!skipInstall) {
    for (const appName of Object.values(playwrightConfigAppNames)) {
      await initBlocklet({ appName });
    }
    console.info('All Blocklet applications initialized successfully');
  }

  const singleAppWallet = ensureWallet({ name: playwrightConfigAppNames.single, onlyFromCache: true });
  const multipleAppWallet = ensureWallet({ name: playwrightConfigAppNames.multiple, onlyFromCache: true });

  const info = await getBlockletServerStatus();
  if (!info) throw new Error('Blocklet server is not running');
  console.info('info', info);

  const singleAppUrl = didToDomain({ did: singleAppWallet.address, port: info.httpsPort });
  const multipleAppUrl = didToDomain({ did: multipleAppWallet.address, port: info.httpsPort });

  await setupUsers({ appName: playwrightConfigAppNames.single, appUrl: singleAppUrl });
  await setupUsers({ appName: playwrightConfigAppNames.multiple, appUrl: multipleAppUrl });

  process.env.PW_TEST_HTML_REPORT_OPEN = 'never';
  await $({
    stdio: 'inherit',
    env: {
      ...process.env,
      HEADLESS: ui ? 'false' : undefined,
      SINGLE_TENANT_APP_URL: singleAppUrl,
      MULTIPLE_TENANT_APP_URL: multipleAppUrl,
      SINGLE_TENANT_APP_NAME: playwrightConfigAppNames.single,
      MULTIPLE_TENANT_APP_NAME: playwrightConfigAppNames.multiple,
    },
  })`playwright test ${ui ? '--ui' : ''}`;

  await cleanupApps(singleAppWallet, multipleAppWallet);
})();
