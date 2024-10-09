#!/usr/bin/env -S node -r ts-node/register

import { addBlocklet, initTestApp, startTestApp } from '@blocklet/testlab/utils/server';
import { ensureWallet, types } from '@blocklet/testlab/utils/wallet';
import Joi from 'joi';

function toCamelCase(str: string) {
  const withoutExtension = str.replace(/\.[^/.]+$/, '');

  return withoutExtension
    .split(/[-_]/)
    .map((word, index) => {
      return index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

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
  const playwrightConfig = {
    single: 'playwright-single-tenant-mode.config.ts',
    multiple: 'playwright-multiple-tenant-mode.config.ts',
  };

  for (const [, configFile] of Object.entries(playwrightConfig)) {
    const appName = toCamelCase(`${configFile.replace('playwright-', '').replace('.config.ts', '')}-app`);
    await initBlocklet({ appName });
  }
})();
