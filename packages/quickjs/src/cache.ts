import { LRUCache } from 'lru-cache';

import { MAX_LRU_CACHE_SIZE_DEFAULT } from './constants';

export interface MemoizedFn {
  cache: LRUCache<any, any>;
}

export function memoize<T extends (...args: any) => any>(
  fn: T,
  {
    lruOptions = {
      max: MAX_LRU_CACHE_SIZE_DEFAULT,
    },
    keyGenerator = JSON.stringify,
  }: {
    lruOptions?: ConstructorParameters<typeof LRUCache>[0];
    keyGenerator?: (...args: any) => any;
  } = {}
): T & MemoizedFn {
  const lru = new LRUCache(lruOptions);

  const fnWithCache = (key: any, ...args: any[]) => {
    const cache = lru.get(key);
    if (cache) return cache;

    const value = fn(...args);
    lru.set(key, value);

    if (value instanceof Promise) {
      value.catch(() => lru.delete(key));
    }

    return value;
  };

  const memoizedFn: T & MemoizedFn = function (...args) {
    const key = keyGenerator(...args);
    if (key instanceof Promise) {
      return key.then((key) => fnWithCache(key, ...args));
    }

    return fnWithCache(key, ...args);
  } as T as any;

  memoizedFn.cache = lru;

  return memoizedFn;
}
