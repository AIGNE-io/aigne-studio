#!/usr/bin/env -S node -r ts-node/register --experimental-require-module

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

const ui = argv.ui;

const portSchema = Joi.number<number>().integer().empty(['']);
const blockletCli = process.env.BLOCKLET_CLI || 'blocklet';
const httpPort = (portSchema.validate(process.env.BLOCKLET_SERVER_HTTP_PORT).value as number) || 9898;
const httpsPort = (portSchema.validate(process.env.BLOCKLET_SERVER_HTTPS_PORT).value as number) || 9899;

(async () => {
  const serverWallet = ensureWallet({ name: 'server' });
  const appWallet = ensureWallet({ name: 'app', role: types.RoleType.ROLE_APPLICATION });
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

  const appUrl = didToDomain({ did: appWallet.address, port: info.httpsPort });
  process.env.TEST_BLOCKLET_APP_URL = appUrl;

  await setupUsers();

  process.env.PW_TEST_HTML_REPORT_OPEN = 'never';
  await $`playwright test ${ui ? '--ui' : ''}`;

  await removeTestApp({ blockletCli, appSk: appWallet.secretKey });
})();
