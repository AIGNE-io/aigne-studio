import path from 'path';

import AuthStorage from '@arcblock/did-connect-storage-nedb';
import { BlockletService } from '@blocklet/sdk/lib/service/blocklet';
import { getWallet } from '@blocklet/sdk/lib/wallet';
import { WalletAuthenticator } from '@blocklet/sdk/lib/wallet-authenticator';
import { WalletHandlers } from '@blocklet/sdk/lib/wallet-handler';

import { Config } from './env';

export const wallet = getWallet();
export const authenticator = new WalletAuthenticator();
export const handlers = new WalletHandlers({
  authenticator,
  tokenStorage: new AuthStorage({ dbPath: path.join(Config.dataDir, 'auth.db') }),
});

export const authClient = new BlockletService();

export const customRoles = [
  {
    name: 'promptsEditor',
    title: 'Prompts Editor',
    description: 'Someone with the Prompts Editor role can create and edit prompts',
  },
];
