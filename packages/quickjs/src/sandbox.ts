import { LRUCache } from 'lru-cache';
import { QuickJSContext, QuickJSHandle, newQuickJSWASMModule } from 'quickjs-emscripten';

import { setupBuiltinModules, setupGlobalVariables } from './builtin';
import { MAX_CACHED_QUICKJS_CONTEXT } from './constants';
import { logger } from './logger';
import BuiltinModules from './modules';
import { transpileModule } from './typescript';

const cache = new LRUCache<
  string,
  { context: QuickJSContext; main: QuickJSHandle; getResult: (resultKey: string) => Promise<any> }
>({
  max: MAX_CACHED_QUICKJS_CONTEXT,
  dispose: (value) => {
    try {
      value.main.dispose();
      value.context.dispose();
      value.context.runtime.dispose();
      logger.info('dispose cached quickjs context success');
    } catch (error) {
      logger.error('dispose cached quickjs context error', error);
    }
  },
});

async function compileCode({
  code,
  functionName,
  filename,
}: {
  code: string;
  functionName: string;
  filename?: string;
}): Promise<{
  getResult: (resultKey: string) => Promise<any>;
  context: QuickJSContext;
  main: QuickJSHandle;
}> {
  const compiledCode = await transpileModule(
    `\
import { dumpResult } from 'builtin';
import { ReadableStream, TransformStream, TextDecoder, TextDecoderStream, EventSourceParserStream } from 'stream';
import { fetch } from 'fetch';
import dayjs from 'dayjs';
import { joinURL, withQuery } from 'ufo';

${code}

export const __AIGNE_LOGIC_ENTRY__ = async (resultKey: string) => dumpResult(resultKey, await ${functionName}())
`,
    (ts) => ({
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
      },
    })
  );

  const quickJs = await newQuickJSWASMModule();
  const runtime = quickJs.newRuntime({
    memoryLimitBytes: 20 * 1024 * 1024,
    moduleLoader: (moduleName: string) => {
      return BuiltinModules[moduleName] || { error: new Error(`Unsupported module ${moduleName}`) };
    },
  });

  const context = runtime.newContext();

  try {
    const main = context
      .evalCode(compiledCode, filename, { type: 'module' })
      .unwrap()
      .consume((v) => context.getProp(v, '__AIGNE_LOGIC_ENTRY__'));

    const { getResult } = setupBuiltinModules(context);

    return {
      getResult,
      context,
      main,
    };
  } catch (error) {
    logger.error('create quickjs runtime error', error);

    try {
      context.dispose();
      runtime.dispose();
    } catch (error) {
      logger.error('dispose quickjs runtime error', error);
    }

    throw error;
  }
}

export async function runUnsafeFunction({
  code,
  functionName,
  filename,
  global,
}: {
  code: string;
  functionName: string;
  filename?: string;
  global: { [key: string]: any };
}) {
  let instance = cache.get(code);
  if (!instance) {
    instance = await compileCode({ code, functionName, filename });
    cache.set(code, instance);
  }

  const vm = instance.context;

  setupGlobalVariables(vm, global);

  const resultKey = crypto.randomUUID();
  const resultKeyHandle = vm.newString(resultKey);

  Promise.resolve(vm.callFunction(instance.main, vm.undefined, resultKeyHandle))
    .then((res) => res.unwrap())
    .then((v) => v.consume((promise) => vm.resolvePromise(promise)))
    .then((v) => v.unwrap().consume((v) => vm.dump(v)))
    .then((result) => {
      logger.debug('quickjs runtime result', result);
    })
    .catch((error) => {
      logger.error('quick runtime error', error);
    })
    .finally(() => {
      try {
        resultKeyHandle.dispose();
        logger.info('dispose result key handle success');
      } catch (error) {
        logger.error('dispose result key handle error', error);
      }
    });

  const jobs = vm.runtime.executePendingJobs().unwrap();
  logger.debug('execute pending jobs', jobs);

  return instance.getResult(resultKey);
}
