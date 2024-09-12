import { LRUCache } from 'lru-cache';
import { QuickJSContext, QuickJSHandle, newQuickJSWASMModule } from 'quickjs-emscripten';

import { setupBuiltinModules, setupGlobalVariables } from './builtin';
import { MAX_CACHED_QUICKJS_CONTEXT } from './constants';
import { toQuickJsObject } from './convert';
import { logger } from './logger';
import BuiltinModules from './modules';
import { transpileModule } from './typescript';

const cache = new LRUCache<
  string,
  Promise<{ context: QuickJSContext; main: QuickJSHandle; getResult: (resultKey: string) => Promise<any> }>
>({
  max: MAX_CACHED_QUICKJS_CONTEXT,
  dispose: async (v) => {
    const value = await v;
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
  global,
}: {
  code: string;
  functionName: string;
  filename?: string;
  global: { [key: string]: any };
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

export const __AIGNE_LOGIC_ENTRY__ = async function (resultKey: string, args?: any = {}) {
  const __args__ = Object.keys(args)

  const code = \`let {\${__args__.join(',')}} = args;\${${functionName}.toString()};${functionName}()\`

  const result = eval(code)

  return dumpResult(resultKey, await result)
}
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
    setupGlobalVariables(context, global);

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
  global = {},
  args = {},
}: {
  code: string;
  functionName: string;
  filename?: string;
  global?: { [key: string]: any };
  args?: { [key: string]: any };
}) {
  let instance = cache.get(code);
  if (!instance) {
    instance = compileCode({ code, functionName, filename, global });
    cache.set(code, instance);
  }

  const { context: vm, main, getResult } = await instance;

  const resultKey = crypto.randomUUID();
  const resultKeyHandle = vm.newString(resultKey);

  try {
    const result = toQuickJsObject(vm, args).consume((args) =>
      vm.callFunction(main, vm.undefined, resultKeyHandle, args)
    );

    const jobs = vm.runtime.executePendingJobs().unwrap();
    logger.debug('execute pending jobs', jobs);

    result.unwrap().consume((promise) => {
      const state = vm.getPromiseState(promise);

      if (state.type === 'rejected') {
        const error =
          'dispose' in state.error
            ? state.error.consume((e) => {
                const { name, message, stack } = vm.dump(e) || {};
                const error = new Error(message || 'Error from QuickJS runtime', { cause: stack });
                error.name = name;
                return error;
              })
            : state.error;
        throw error;
      }

      const result =
        state.type === 'fulfilled'
          ? Promise.resolve(state.value.consume((v) => vm.dump(v)))
          : vm.resolvePromise(promise).then((v) => v.unwrap().consume((v) => vm.dump(v)));

      result
        .then((result) => {
          logger.debug('quickjs runtime result', result);
        })
        .catch((error) => {
          logger.error('quick runtime error', error);
        });
    });
  } finally {
    try {
      resultKeyHandle.dispose();
      logger.info('dispose result key handle success');
    } catch (error) {
      logger.error('dispose result key handle error', error);
    }
  }

  return getResult(resultKey);
}
