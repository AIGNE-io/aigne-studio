#!/usr/bin/env -S node -r ts-node/register

import { addBlocklet, initTestApp, startTestApp } from '@blocklet/testlab/utils/server';
import { ensureWallet, types } from '@blocklet/testlab/utils/wallet';
import Joi from 'joi';
import { argv } from 'zx';

import { playwrightConfigAppNames } from '../tests/utils';

const portSchema = Joi.number<number>().integer().empty(['']);
const blockletCli = process.env.BLOCKLET_CLI || 'blocklet';
const httpPort = (portSchema.validate(process.env.BLOCKLET_SERVER_HTTP_PORT).value as number) || 80;
const httpsPort = (portSchema.validate(process.env.BLOCKLET_SERVER_HTTPS_PORT).value as number) || 443;

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
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await addBlocklet({
    blockletCli,
    appId: appWallet.address,
    bundle: 'blocklets/ai-runtime/.blocklet/bundle',
    mountPoint: '/aigne-runtime',
  });

  await startTestApp({ blockletCli, appWallet });
};

(async () => {
  if (argv.skip) return;

  // const initPromises = Object.entries(playwrightConfigAppNames).map(([, appName]) => initBlocklet({ appName }));
  // await Promise.all(initPromises);

  for (const [, appName] of Object.entries(playwrightConfigAppNames)) {
    await initBlocklet({ appName });
  }

  console.log('All Blocklet applications initialized successfully');
})();
