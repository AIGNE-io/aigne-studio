#!/usr/bin/env -S node -r ts-node/register --experimental-require-module

import { getBlockletServerStatus, removeTestApp, startTestApp } from '@blocklet/testlab/utils/server';
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
  const appWallet = ensureWallet({ name: 'app', role: types.RoleType.ROLE_APPLICATION, forceRegenerate: true });
  const ownerWallet = ensureWallet({ name: 'owner' });

  await startTestApp({
    blockletCli,
    serverWallet,
    appWallet,
    ownerWallet,
    appBundle: 'blocklets/ai-studio/.blocklet/bundle',
    httpPort,
    httpsPort,
  });

  const info = await getBlockletServerStatus();
  if (!info) throw new Error('Blocklet server is not running');

  const appUrl = didToDomain({ did: appWallet.address, port: info.httpsPort });
  process.env.TEST_BLOCKLET_APP_URL = appUrl;

  await setupUsers();

  await $`playwright test ${ui ? '--ui' : ''}`;

  await removeTestApp({ blockletCli, appSk: appWallet.secretKey });
})();
