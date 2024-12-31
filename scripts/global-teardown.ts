/* eslint-disable import/no-extraneous-dependencies,no-console */
import { removeTestApp } from '@blocklet/testlab/utils/server';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';

import { playwrightConfigAppNames } from '../tests/utils';

const blockletCli = process.env.BLOCKLET_CLI || 'blocklet';

const ci = !!process.env.CI;

export default async function globalTeardown() {
  if (ci) {
    return;
  }

  const singleAppWallet = ensureWallet({ name: playwrightConfigAppNames.single, onlyFromCache: true });
  const multipleAppWallet = ensureWallet({ name: playwrightConfigAppNames.multiple, onlyFromCache: true });
  // 其实本地才需要清理应用，CI 环境不需要
  await Promise.all([
    removeTestApp({ blockletCli, appSk: singleAppWallet.secretKey }),
    removeTestApp({ blockletCli, appSk: multipleAppWallet.secretKey }),
  ]);
}
