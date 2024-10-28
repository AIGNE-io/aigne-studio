import { walletHandler } from '@api/libs/auth';
import { Router } from 'express';

import verifyVC from './verify-vc';

export function attachWalletHandlers(router: Router) {
  walletHandler.attach({ app: router, ...verifyVC });
}
