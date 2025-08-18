import { DID_TYPE_ARCBLOCK, types } from '@arcblock/did';
import { fromAppDid } from '@arcblock/did-ext';
import { showAssetOrVC } from '@blocklet/testlab/utils/auth';
import { claimDIDSpace, getAuthUrl, login } from '@blocklet/testlab/utils/playwright';
import { ensureWallet } from '@blocklet/testlab/utils/wallet';
import { fromBase64 } from '@ocap/util';
import { chromium } from '@playwright/test';

import { cacheResult } from './cache';
import { SPACE_APP_ID, TestConstants } from './constants';

export async function setupUsers({ appName, appUrl, rootSeed }: { appName: string; appUrl: string; rootSeed: string }) {
  const appWallet = ensureWallet({ name: appName, onlyFromCache: false, role: types.RoleType.ROLE_APPLICATION });
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

  for (const { wallet, name, vc } of vcs) {
    const page = await browser.newPage();

    // login as owner and bind did space
    await page.goto(appUrl);
    const remindButton = page.getByRole('button', { name: 'Remind Me Later' });
    await remindButton.waitFor({ state: 'visible' });
    await remindButton.click({ force: true });

    await login({ page, wallet, appWallet, passport: { name, title: name } });

    const connectNowButton = page.getByRole('button', { name: 'Connect Now' });
    if ((await connectNowButton.count()) > 0) {
      await connectNowButton.click();
      const popupPage = await page.waitForEvent('popup');
      await popupPage.waitForLoadState('networkidle');

      // HACK: @jianchao 目前的方式并不优雅，本质上 @blocklet/testlab 应该提供配置应用环境变量的能力，进而修改 DID_SPACES_BASE_URL, 来影响 popup 的跳转地址
      const url = popupPage.url().replace('https://www.didspaces.com/app', 'https://spaces.staging.arcblock.io/app');
      await popupPage.evaluate((redirectUrl) => {
        window.location.href = redirectUrl;
      }, url);
      await popupPage.waitForLoadState('networkidle');
      // wait 3 s
      await popupPage.waitForTimeout(3 * 1000);

      const authUrl = await getAuthUrl({ page: popupPage });
      await showAssetOrVC({ authUrl, wallet: spaceWallet, vc, meta: { purpose: 'DidSpace' } });

      await popupPage.getByRole('button', { name: 'Authorize' }).click();
      await page.waitForTimeout(5 * 1000);
    }
  }

  await browser.close();
}
