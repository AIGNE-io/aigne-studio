#!/usr/bin/env -S node -r ts-node/register --experimental-require-module

import { startTestBlocklet } from '@blocklet/testlab/utils/server';
import { ensureWallet, types } from '@blocklet/testlab/utils/wallet';

import { setupUsers } from '../tests/utils/auth';
import { TestConstants } from '../tests/utils/constants';

(async () => {
  const serverWallet = ensureWallet({ name: 'server' });
  const appWallet = ensureWallet({ name: 'app', role: types.RoleType.ROLE_APPLICATION, forceRegenerate: true });
  const ownerWallet = ensureWallet({ name: 'owner' });

  await startTestBlocklet({
    blockletServer: TestConstants.blockletCli,
    serverWallet,
    appWallet,
    ownerWallet,
    appBundle: 'blocklets/ai-studio/.blocklet/bundle',
    httpPort: TestConstants.serverHttpPort,
    httpsPort: TestConstants.serverHttpsPort,
  });

  await setupUsers();
})();
