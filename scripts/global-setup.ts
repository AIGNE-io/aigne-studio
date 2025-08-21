#!/usr/bin/env -S node -r dotenv/config -r ts-node/register

/* eslint-disable import/no-extraneous-dependencies,no-console */
import {
  addBlocklet,
  getBlockletServerStatus,
  initTestApp,
  removeTestApp,
  startTestApp,
} from '@blocklet/testlab/utils/server';
import { didToDomain, ensureWallet, types } from '@blocklet/testlab/utils/wallet';
import dotenv from 'dotenv';
import Joi from 'joi';
import { chromium } from 'playwright';
import { $, argv } from 'zx';

import { playwrightConfigAppNames } from '../tests/utils';

dotenv.config();

const skipInstall = ['1', 'true'].includes(process.env.SKIP_INSTALL || '') || argv['skip-install'] === true;
const rootSeed = argv.rootSeed || process.env.ROOT_SEED;
if (!rootSeed) {
  throw new Error('rootSeed is not set');
}

const { ui } = argv;
if (ui) process.env.HEADLESS = 'false';

console.info({ skipInstall, rootSeed });

const portSchema = Joi.number<number>().integer().empty(['']);
const httpPort = (portSchema.validate(process.env.BLOCKLET_SERVER_HTTP_PORT).value as number) || 80;
const httpsPort = (portSchema.validate(process.env.BLOCKLET_SERVER_HTTPS_PORT).value as number) || 443;
const blockletCli = process.env.BLOCKLET_CLI || 'blocklet';

const singleAppWallet = ensureWallet({
  name: playwrightConfigAppNames.single,
  role: types.RoleType.ROLE_APPLICATION,
  onlyFromCache: false,
});
const multipleAppWallet = ensureWallet({
  name: playwrightConfigAppNames.multiple,
  role: types.RoleType.ROLE_APPLICATION,
  onlyFromCache: false,
});

const initBlocklet = async ({ appName, skipInstall }: { appName: string; skipInstall: boolean }) => {
  const appWallet = ensureWallet({ name: appName, role: types.RoleType.ROLE_APPLICATION });
  if (skipInstall) {
    await startTestApp({ blockletCli, appWallet });
    return;
  }

  await removeTestApp({ blockletCli, appSk: appWallet.secretKey }).catch((error) => {
    console.warn('failed to remove test app', error);
  });
  const serverWallet = ensureWallet({ name: 'server' });
  const ownerWallet = ensureWallet({ name: 'owner' });

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
    setTimeout(() => resolve(), 1000 * 30);
  });

  await addBlocklet({
    blockletCli,
    appId: appWallet.address,
    bundle: 'blocklets/ai-runtime/.blocklet/bundle',
    mountPoint: '/aigne-runtime',
  });

  await startTestApp({ blockletCli, appWallet });
};

export default async function globalSetup() {
  // await $`rm -rf .blocklet-tests/ .playwright/ playwright-report/`;

  const browser = await chromium.launch();
  const context = await browser.newContext();

  try {
    await context.tracing.start({ screenshots: true, snapshots: true });
    await $`export DID_SPACES_BASE_URL=https://spaces.staging.arcblock.io/app`;

    await initBlocklet({ appName: playwrightConfigAppNames.single, skipInstall });
    await initBlocklet({ appName: playwrightConfigAppNames.multiple, skipInstall });

    const info = await getBlockletServerStatus({ blockletCli });
    if (!info) throw new Error('Blocklet server is not running');
    console.info('info', info);

    const singleAppUrl = didToDomain({ did: singleAppWallet.address, port: info.httpsPort });
    const multipleAppUrl = didToDomain({ did: multipleAppWallet.address, port: info.httpsPort });

    process.env.ROOT_SEED = rootSeed;
    process.env.PW_TEST_HTML_REPORT_OPEN = 'never';
    process.env.SINGLE_TENANT_APP_URL = singleAppUrl;
    process.env.MULTIPLE_TENANT_APP_URL = multipleAppUrl;
    process.env.SINGLE_TENANT_APP_NAME = playwrightConfigAppNames.single;
    process.env.MULTIPLE_TENANT_APP_NAME = playwrightConfigAppNames.multiple;
  } catch (error) {
    console.error(error);
    await context.tracing.stop({
      path: './playwright-report/failed-global-setup-trace.zip',
    });
    throw error;
  } finally {
    await browser.close();
  }
}
