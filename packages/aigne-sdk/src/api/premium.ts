import config from '@blocklet/sdk/lib/config';
import AuthService from '@blocklet/sdk/lib/service/auth';
import { LRUCache } from 'lru-cache';

import { Quotas } from '../quotas';

const userPassportCache = new LRUCache<string, string[]>({
  maxSize: 500,
  sizeCalculation: () => {
    return 1;
  },
  // 2h (ms)
  ttl: 1000 * 60 * 60 * 2,
});

export async function getUserPassports(did: string) {
  if (!did) return [];
  if (!userPassportCache.has(did)) {
    const result = await authClient.getUser(did);
    const passports = result?.user?.passports?.filter((x) => x.status === 'valid')?.map((x) => x.name) || [];
    userPassportCache.set(did, passports);
  }
  return userPassportCache.get(did);
}

const authClient = new AuthService();

export const quotaChecker = new Quotas(config.env.preferences);

config.events.on(config.Events.envUpdate, () => {
  quotaChecker.setPreferences(config.env.preferences);
});
