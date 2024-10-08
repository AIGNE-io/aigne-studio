import { getComponentMountPoint } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import AuthService from '@blocklet/sdk/lib/service/auth';
import { LRUCache } from 'lru-cache';
import { joinURL } from 'ufo';

import { PAYMENT_KIT_COMPONENT_DID } from '../constants';

export const authClient = new AuthService();

export const proPassport = {
  name: 'aignePro',
  title: 'AIGNE Pro',
  description: 'AIGNE Pro passport holders have access to exclusive pro features.',
};

const userPassportCache = new LRUCache<string, string[]>({
  maxSize: 300,
  sizeCalculation: () => {
    return 1;
  },
  // 2h (ms)
  ttl: 1000 * 60 * 60 * 2,
});

async function getUserPassports(did: string) {
  if (!userPassportCache.has(did)) {
    const result = await authClient.getUser(did);
    const passports = result?.user?.passports?.filter((x) => x.status === 'valid')?.map((x) => x.name) || [];
    userPassportCache.set(did, passports);
  }
  return userPassportCache.get(did);
}

export async function isProUser(did: string) {
  const passports = await getUserPassports(did);
  return passports?.includes(proPassport.name);
}

export async function getProPaymentLink() {
  const { role } = await authClient.getRole(proPassport.name);
  const pay = role.extra?.acquire?.pay;
  return pay
    ? joinURL(config.env.appUrl, getComponentMountPoint(PAYMENT_KIT_COMPONENT_DID), `/api/redirect/checkout/${pay}`)
    : null;
}
