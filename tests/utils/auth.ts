import { showAssetOrVC } from '@blocklet/testlab/utils/auth';
import { claimDIDSpace, getAuthUrl, login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';
import { chromium } from '@playwright/test';

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
      const page = await browser.newPage({});
      const vc = await claimDIDSpace({ page, wallet });
      await page.close();
      return { ...rest, wallet, vc };
    })
  );

  await Promise.all(
    vcs.map(async ({ wallet, name, vc }) => {
      const page = await browser.newPage();

      // login as owner and bind did space
      await page.goto(TestConstants.appUrl);

      await login({ page, wallet, appWallet, passport: { name, title: name } });

      await showAssetOrVC({ authUrl: await getAuthUrl({ page }), wallet, vc, meta: { purpose: 'DidSpace' } });
    })
  );

  await browser.close();
}
