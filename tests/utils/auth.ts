import { showAssetOrVC } from '@blocklet/testlab/utils/auth';
import { claimDIDSpace, getAuthUrl, login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';
import { chromium } from '@playwright/test';

import { cacheResult } from './cache';
import { TestConstants } from './constants';
import { adminRootSeed, getAdminWallet, getGuestWallet, getOwnerWallet, guestRootSeed, ownerRootSeed } from './wallet';

export async function setupUsers({ appName, appUrl }: { appName: string; appUrl: string }) {
  const appWallet = ensureWallet({ name: appName, onlyFromCache: true });

  const wallets = [
    { wallet: getOwnerWallet(), name: 'owner', rootSeed: ownerRootSeed },
    { wallet: getAdminWallet(), name: 'admin', rootSeed: adminRootSeed },
    { wallet: getGuestWallet(), name: 'guest', rootSeed: guestRootSeed },
  ];

  const browser = await chromium.launch({
    headless: TestConstants.headless,
    timeout: 200000,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // claim did space for wallet
  const vcs = await Promise.all(
    wallets.map(async ({ wallet, ...rest }) => {
      const vc = await cacheResult(TestConstants.didSpaceVCPath(rest.name), async () => {
        const page = await browser.newPage({});
        const result = await claimDIDSpace({ page, rootSeed: rest.rootSeed });
        await page.close();
        return result;
      });
      return { ...rest, wallet, vc };
    })
  );

  await Promise.all(
    vcs.map(async ({ wallet, name, vc }) => {
      const page = await browser.newPage();

      // login as owner and bind did space
      await page.goto(appUrl);

      await login({ page, wallet, appWallet, passport: { name, title: name } });

      const authUrl = await getAuthUrl({ page }).catch((error) => {
        console.error('failed to get auth url to connect to did space, skip it', error);
        return null;
      });

      if (authUrl) await showAssetOrVC({ authUrl, wallet, vc, meta: { purpose: 'DidSpace' } });
    })
  );

  await browser.close();
}
