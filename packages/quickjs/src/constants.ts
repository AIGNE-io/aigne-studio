import { logger } from './logger';

export const { SANDBOX_RUNTIME_TYPE } = process.env;

export const QUICKJS_RUNTIME_POOL_SIZE_MAX =
  successOr(() => parseInt(process.env.QUICKJS_RUNTIME_POOL_SIZE_MAX!, 10)) || 10;

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
