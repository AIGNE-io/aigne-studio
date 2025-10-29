import config from '@blocklet/sdk/lib/config';
import { BlockletService } from '@blocklet/sdk/lib/service/blocklet';

import { Quotas } from '../quotas';

// const userPassportCache = new LRUCache<string, string[]>({
//   max: 500,
//   ttl: Number(process.env.AIGNE_PASSPORTS_CACHE_TTL) || 60e3,
// });

// TODO: 启用缓存 https://github.com/blocklet/ai-studio/issues/1476
// export async function getUserPassports(did: string) {
//   if (!did) return [];
//   if (!userPassportCache.has(did)) {
//     const result = await authClient.getUser(did);
//     const passports = result?.user?.passports?.filter((x) => x.status === 'valid')?.map((x) => x.name) || [];
//     userPassportCache.set(did, passports);
//   }
//   return userPassportCache.get(did);
// }

export async function getUserPassports(did?: string) {
  if (!did) return [];
  const result = await authClient.getUser(did);
  return result?.user?.passports?.filter((x) => x.status === 'valid')?.map((x) => x.name) || [];
}

const authClient = new BlockletService();

export const quotaChecker = new Quotas(config.env.preferences);

config.events.on(config.Events.envUpdate, () => {
  quotaChecker.setPreferences(config.env.preferences);
});
