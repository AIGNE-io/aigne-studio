#!/usr/bin/env -S node -r ts-node/register

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

const portSchema = Joi.number<number>().integer().empty(['']);
const blockletCli = process.env.BLOCKLET_CLI || 'blocklet';
const httpPort = (portSchema.validate(process.env.BLOCKLET_SERVER_HTTP_PORT).value as number) || 80;
const httpsPort = (portSchema.validate(process.env.BLOCKLET_SERVER_HTTPS_PORT).value as number) || 443;

(async () => {
  const configFile = argv.config || 'playwright.config.ts';
  const appName = toCamelCase(`${configFile.replace('playwright-', '').replace('.config.ts', '')}-app`);

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
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await addBlocklet({
    blockletCli,
    appId: appWallet.address,
    bundle: 'blocklets/ai-runtime/.blocklet/bundle',
    mountPoint: '/aigne-runtime',
  });

  await startTestApp({ blockletCli, appWallet });

  const info = await getBlockletServerStatus();
  if (!info) throw new Error('Blocklet server is not running');
  console.log('info', info);

  const appUrl = didToDomain({ did: appWallet.address, port: info.httpsPort });
  console.log('appUrl', appUrl);

  await setupUsers({ appName, appUrl });
  process.env.PW_TEST_HTML_REPORT_OPEN = 'never';

  const command = [
    `TEST_BLOCKLET_APP_URL=${appUrl}`,
    `TEST_BLOCKLET_APP_NAME=${appName}`,
    'playwright test',
    ui ? '--ui' : '',
    `--config=${configFile}`,
  ]
    .filter(Boolean)
    .join(' ');

  await $`${command}`;

  await removeTestApp({ blockletCli, appSk: appWallet.secretKey });
})();
