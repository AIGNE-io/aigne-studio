import { logger } from './logger';

export const MAX_CACHED_QUICKJS_CONTEXT = successOr(() => parseInt(process.env.MAX_CACHED_QUICKJS_CONTEXT!, 10)) || 100;

export const MAX_LRU_CACHE_SIZE_DEFAULT =
  successOr(() => parseInt(process.env.MAX_LRU_CACHE_SIZE_DEFAULT!, 10)) || 1024;

function successOr<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch (error) {
    logger.info('tryOr error', error);
    return undefined;
  }
}
