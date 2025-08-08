import path from 'path';

import AuthStorage from '@arcblock/did-connect-storage-nedb';
import AuthService from '@blocklet/sdk/lib/service/auth';
import getWallet from '@blocklet/sdk/lib/wallet';
import WalletAuthenticator from '@blocklet/sdk/lib/wallet-authenticator';
import WalletHandler from '@blocklet/sdk/lib/wallet-handler';

import { Config } from './env';

export const wallet = getWallet();
export const authenticator = new WalletAuthenticator();
export const handlers = new WalletHandler({
  authenticator,
  tokenStorage: new AuthStorage({
    dbPath: path.join(Config.dataDir, 'auth.db'),
  }),
});

export const authClient = new AuthService();

export const customRoles = [
  {
    name: 'promptsEditor',
    title: 'Prompts Editor',
    description: 'Someone with the Prompts Editor role can create and edit prompts',
  },
];
