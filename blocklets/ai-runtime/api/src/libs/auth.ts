import path from 'path';

import AuthStorage from '@arcblock/did-connect-storage-nedb';
import getWallet from '@blocklet/sdk/lib/wallet';
import WalletAuthenticator from '@blocklet/sdk/lib/wallet-authenticator';
import WalletHandler from '@blocklet/sdk/lib/wallet-handler';

import { Config } from './env';

export const wallet = getWallet();
export const authenticator = new WalletAuthenticator();
export const walletHandler = new WalletHandler({
  authenticator,
  tokenStorage: new AuthStorage({ dbPath: path.join(Config.dataDir, 'auth.db') }),
});
