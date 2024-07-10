import { showAssetOrVC } from '@blocklet/testlab/utils/auth';
import { claimDIDSpace, getAuthUrl, login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';
import { chromium } from '@playwright/test';

import { cacheResult } from './cache';
import { TestConstants } from './constants';

export async function setupUsers() {
  const appWallet = ensureWallet({ name: 'app', onlyFromCache: true });
  const ownerWallet = ensureWallet({ name: 'owner' });
  const adminWallet = ensureWallet({ name: 'admin' });

  const wallets = [
    { wallet: ownerWallet, name: 'owner' },
    { wallet: adminWallet, name: 'admin' },
  ];

  const browser = await chromium.launch({ headless: TestConstants.headless });

  // claim did space for wallet
  const vcs = await Promise.all(
    wallets.map(async ({ wallet, ...rest }) => {
      const vc = await cacheResult(TestConstants.didSpaceVCPath(rest.name), async () => {
        const page = await browser.newPage({});
        const result = await claimDIDSpace({ page, wallet });
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
      await page.goto(TestConstants.appUrl);

      await login({ page, wallet, appWallet, passport: { name, title: name } });

      const authUrl = await getAuthUrl({ page }).catch((error) => {
        console.log('failed to get auth url to connect to did space, skip it', error);
        return null;
      });

      if (authUrl) await showAssetOrVC({ authUrl, wallet, vc, meta: { purpose: 'DidSpace' } });
    })
  );

  await browser.close();
}
