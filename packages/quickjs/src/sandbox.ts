import { Pool, createPool } from 'generic-pool';
import { QuickJSContext, QuickJSHandle, Scope, newQuickJSWASMModule } from 'quickjs-emscripten';

import { setupBuiltinModules, setupGlobalVariables } from './builtin';
import { QUICKJS_RUNTIME_POOL_SIZE_MAX, SANDBOX_RUNTIME_TYPE } from './constants';
import { toQuickJsObject } from './convert';
import { logger } from './logger';
import BuiltinModules from './modules';
import { transpileModule } from './typescript';
import { runFunctionInVM2 } from './vm2';

const sandboxCache = new Map<string, Pool<Sandbox>>();

export interface SandboxOptions {
  context: QuickJSContext;
  module: QuickJSHandle;
  dumpResult: (resultKey: string) => Promise<any>;
}

export interface SandboxInitOptions {
  cache?: boolean;
  code: string;
  filename?: string;
  global?: { [key: string]: any };
  moduleLoader?: (moduleName: string) => string | undefined;
}

export class Sandbox {
  static async create({ ...options }: SandboxInitOptions): Promise<Sandbox> {
    return createRuntime(options).then((opt) => new Sandbox(opt));
  }

  static async acquire({ ...options }: SandboxInitOptions): Promise<Sandbox> {
    let pool = sandboxCache.get(options.code);
    if (!pool) {
      pool = createPool(
        {
          create: () => createRuntime(options).then((opt) => new Sandbox(opt, pool)),
          destroy: async (sandbox) => {
            try {
              sandbox.dispose();
              logger.debug('dispose sandbox from pool success', options.filename);
            } catch (error) {
              logger.error('dispose sandbox from pool error', options.filename, error);
            }
          },
        },
        {
          max: QUICKJS_RUNTIME_POOL_SIZE_MAX,
          autostart: false,
        }
      );
      pool.on('factoryCreateError', (error) => {
        // NOTE: avoid waiting for create runtime forever when the creation fails <https://github.com/coopernurse/node-pool/issues/175>
        (pool as any)._waitingClientsQueue.dequeue().reject(error);
      });

      sandboxCache.set(options.code, pool);
    }

    return pool.acquire();
  }

  static async callFunction(options: SandboxInitOptions & { functionName: string; args?: any[] }) {
    if (SANDBOX_RUNTIME_TYPE === 'vm2') {
      return runFunctionInVM2(options);
    }

    const sandbox = await Sandbox.acquire(options);
    return sandbox.callFunction({
      ...options,
      onClose: () => {
        // FIXME: use pool.release(sandbox) instead of sandbox.destroy() to reuse the runtime
        // but it will cause memory leak because the runtime is not disposed
        sandbox.pool?.destroy(sandbox);
      },
    });
  }

  private constructor(
    public readonly options: SandboxOptions,
    private readonly pool?: Pool<Sandbox>
  ) {}

  async release() {
    await this.pool?.release(this);
  }

  dispose() {
    this.options.module.dispose();
    this.options.context.dispose();
    this.options.context.runtime.dispose();
  }

  async callFunction({
    functionName,
    args = [],
    onClose,
  }: {
    functionName: string;
    args?: any[];
    onClose?: () => void;
  }) {
    const { context: vm, module, dumpResult } = this.options;

    const resultKey = crypto.randomUUID();
    const result = dumpResult(resultKey);

    const r = Scope.withScope((scope) => {
      const call = scope.manage(vm.getProp(module, 'callFunction'));
      const fn = scope.manage(vm.newString(functionName));
      const inputs = scope.manage(toQuickJsObject(vm, args));
      const resultKeyHandle = scope.manage(vm.newString(resultKey));

      return vm.callFunction(call, vm.undefined, resultKeyHandle, fn, inputs);
    });

    const jobs = vm.runtime.executePendingJobs().unwrap();
    logger.debug('execute pending jobs', jobs);

    r.unwrap().consume((promise) => {
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

        // NOTE: important to catch the error to avoid unhandled promise rejection
        result.catch(() => {});
        throw error;
      }

      const r =
        state.type === 'fulfilled'
          ? Promise.resolve(state.value.consume((v) => vm.dump(v)))
          : vm.resolvePromise(promise).then((v) => v.unwrap().consume((v) => vm.dump(v)));

      r.then((result) => {
        logger.debug('quickjs runtime result', result);
      })
        .catch((error) => {
          logger.error('quick runtime error', error);
        })
        .finally(() => {
          onClose?.();
        });
    });

    return result;
  }
}

async function createRuntime({ code, filename, global, moduleLoader }: SandboxInitOptions): Promise<SandboxOptions> {
  const compiledCode = await transpileModule(
    `\
import { dumpResult } from 'builtin';
import { ReadableStream, TransformStream, TextDecoder, TextDecoderStream, EventSourceParserStream } from 'stream';
import dayjs from 'dayjs';
import fetch from 'fetch';
import { joinURL, withQuery } from 'ufo';

${code}

export async function callFunction(resultKey: string, functionName: string, args: any[] = []) {
  const exports = eval(\`({ \${functionName} })\`)
  return dumpResult(resultKey, exports[functionName](...args))
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
    // TODO: make it configurable
    memoryLimitBytes: 100 * 1024 * 1024,
    moduleLoader: (moduleName: string) => {
      return (
        moduleLoader?.(moduleName) ??
        (BuiltinModules[moduleName] || { error: new Error(`Unsupported module ${moduleName}`) })
      );
    },
  });

  const context = runtime.newContext();

  try {
    const { dumpResult } = setupBuiltinModules(context);
    if (global) setupGlobalVariables(context, global);

    const module = context.evalCode(compiledCode, filename, { type: 'module' }).unwrap();

    return { dumpResult, context, module };
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
