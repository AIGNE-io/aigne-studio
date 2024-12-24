/* eslint-disable import/no-extraneous-dependencies,no-console */
import { removeTestApp } from '@blocklet/testlab/utils/server';

const blockletCli = process.env.BLOCKLET_CLI || 'blocklet';

export default async function cleanupApps(singleAppWallet: any, multipleAppWallet: any) {
  await Promise.all([
    removeTestApp({ blockletCli, appSk: singleAppWallet.secretKey }),
    removeTestApp({ blockletCli, appSk: multipleAppWallet.secretKey }),
  ]);
}
