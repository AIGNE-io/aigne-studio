import { DID_TYPE_ARCBLOCK } from '@arcblock/did';
import { fromAppDid } from '@arcblock/did-ext';
import { showAssetOrVC } from '@blocklet/testlab/utils/auth';
import { claimDIDSpace, getAuthUrl, login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';
import { fromBase64 } from '@ocap/util';
import { chromium } from '@playwright/test';

import { cacheResult } from './cache';
import { SPACE_APP_ID, TestConstants } from './constants';

export async function setupUsers({ appName, appUrl, rootSeed }: { appName: string; appUrl: string; rootSeed: string }) {
  const appWallet = ensureWallet({ name: appName, onlyFromCache: true });
  const ownerWallet = ensureWallet({ name: 'owner' });
  const adminWallet = ensureWallet({ name: 'admin' });
  const guestWallet = ensureWallet({ name: 'guest' });

  const spaceWallet = fromAppDid(SPACE_APP_ID, fromBase64(rootSeed) as unknown as string, DID_TYPE_ARCBLOCK, 0);
  // eslint-disable-next-line no-console
  console.log('connect space wallet', spaceWallet);

  const wallets = [
    { wallet: ownerWallet, name: 'owner' },
    { wallet: adminWallet, name: 'admin' },
    { wallet: guestWallet, name: 'guest' },
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
        const result = await claimDIDSpace({ page, wallet: spaceWallet });
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
