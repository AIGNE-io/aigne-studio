import { TranspileOptions } from 'typescript';

import { memoize } from './cache';

export const transpileModule = memoize(
  async (source: string, options: TranspileOptions | ((ts: typeof import('typescript')) => TranspileOptions)) => {
    const ts = await import('typescript');
    return ts.transpileModule(source, typeof options === 'function' ? options(ts) : options).outputText;
  },
  {
    keyGenerator: async (source, options) =>
      source + JSON.stringify(typeof options === 'function' ? options(await import('typescript')) : options),
  }
);
