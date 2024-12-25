#!/usr/bin/env -S node -r dotenv/config -r ts-node/register

/* eslint-disable import/no-extraneous-dependencies,no-console */
import { addBlocklet, getBlockletServerStatus, initTestApp, startTestApp } from '@blocklet/testlab/utils/server';
import { didToDomain, ensureWallet, types } from '@blocklet/testlab/utils/wallet';
import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import Joi from 'joi';
import { $, argv } from 'zx';

import { playwrightConfigAppNames } from '../tests/utils';
import { setupUsers } from '../tests/utils/auth';

const isDevelopment = process.env.NODE_ENV === 'development';
if (isDevelopment) {
  dotenv.config();
}

const skipInstall = argv['skip-install'] === true;
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

const initBlocklet = async ({ appName }: { appName: string }) => {
  const serverWallet = ensureWallet({ name: 'server' });
  const ownerWallet = ensureWallet({ name: 'owner' });
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

export default async function globalSetup() {
  // await $`rm -rf .blocklet-tests/ .playwright/ playwright-report/`;

  const browser = await chromium.launch();
  const context = await browser.newContext();

  try {
    await context.tracing.start({ screenshots: true, snapshots: true });
    await $`export DID_SPACES_BASE_URL=https://spaces.staging.arcblock.io/app`;

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

    await setupUsers({ appName: playwrightConfigAppNames.single, appUrl: singleAppUrl, rootSeed });
    await setupUsers({ appName: playwrightConfigAppNames.multiple, appUrl: multipleAppUrl, rootSeed });

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
