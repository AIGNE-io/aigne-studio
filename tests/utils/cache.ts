import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';

export async function cacheResult(cache: string, fn: () => Promise<any>) {
  try {
    const result = JSON.parse(readFileSync(cache).toString());
    if (!result) throw new Error('cache does not exist');

    return result;
  } catch (error) {
    const result = await fn();

    mkdirSync(dirname(cache), { recursive: true });
    writeFileSync(cache, JSON.stringify(result, null, 2));

    console.log('cache does not exist, new result is', result);

    return result;
  }
}
