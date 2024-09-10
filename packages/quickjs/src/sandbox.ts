import { newQuickJSWASMModule, shouldInterruptAfterDeadline } from 'quickjs-emscripten';

import { setupBuiltinModules, setupGlobalVariables } from './builtin';
import { logger } from './logger';
import BuiltinModules from './modules';
import { transpileModule } from './typescript';

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
  const compiledCode = await transpileModule(`\
import { dumpResult } from 'builtin';
import { ReadableStream, TransformStream, TextDecoder, TextDecoderStream, EventSourceParserStream } from 'stream';
import { fetch } from 'fetch';
import dayjs from 'dayjs';
import { joinURL, withQuery } from 'ufo';

export const result = await dumpResult((async function() {
  ${code}

  return ${functionName}()
})())
`);

  const quickJs = await newQuickJSWASMModule();
  const runtime = quickJs.newRuntime({
    memoryLimitBytes: 20 * 1024 * 1024,
    interruptHandler: shouldInterruptAfterDeadline(Date.now() + 120e3),
    moduleLoader: (moduleName: string) => {
      return BuiltinModules[moduleName] || { error: new Error(`Unsupported module ${moduleName}`) };
    },
  });

  const vm = runtime.newContext();

  const { resultPromise } = setupBuiltinModules(vm);

  setupGlobalVariables(vm, global);

  Promise.resolve(vm.evalCode(compiledCode, filename, { type: 'module' }))
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
        vm.dispose();
        vm.runtime.dispose();
      } catch (error) {
        logger.error('quick runtime dispose error', error);
      }
    });

  const jobs = runtime.executePendingJobs().unwrap();
  logger.debug('execute pending jobs', jobs);

  return resultPromise;
}
