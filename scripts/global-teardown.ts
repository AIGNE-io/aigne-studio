/* eslint-disable import/no-extraneous-dependencies,no-console */
import { removeTestApp } from '@blocklet/testlab/utils/server';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';

import { playwrightConfigAppNames } from '../tests/utils';

const blockletCli = process.env.BLOCKLET_CLI || 'blocklet';

const singleAppWallet = ensureWallet({ name: playwrightConfigAppNames.single, onlyFromCache: true });
const multipleAppWallet = ensureWallet({ name: playwrightConfigAppNames.multiple, onlyFromCache: true });

export default async function cleanupApps() {
  await Promise.all([
    removeTestApp({ blockletCli, appSk: singleAppWallet.secretKey }),
    removeTestApp({ blockletCli, appSk: multipleAppWallet.secretKey }),
  ]);
}
