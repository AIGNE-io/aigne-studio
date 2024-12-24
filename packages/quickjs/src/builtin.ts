/// <reference path="../global.d.ts" />

import { QuickJSContext } from 'quickjs-emscripten';
import { joinURL, withQuery } from 'ufo';

import { toQuickJsObject } from './convert';
import { withResolvers } from './promise';

function builtinModule(): {
  dumpResult: (resultKey: string) => Promise<any>;
  global: QuickJSGlobal;
} {
  const scopes: {
    [key: string]: {
      readableStreamControllers: { [key: string]: ReadableStreamController<any> };
      result: ReturnType<typeof withResolvers<any>>;
    };
  } = {};

  const getScope = (resultKey: string) => {
    let scope = scopes[resultKey];
    if (!scope) {
      scope = { readableStreamControllers: {}, result: withResolvers() };
      scopes[resultKey] = scope;
    }

    return scope;
  };

  const textDecoders: TextDecoder[] = [];

  return {
    dumpResult: (resultKey: string) => getScope(resultKey).result.promise,
    global: {
      fetch: (...args) =>
        fetch(...args).then((res) => {
          return {
            ok: res.ok,
            status: res.status,
            statusText: res.statusText,
            type: res.type,
            url: res.url,
            headers: Object.fromEntries(res.headers.entries()) as any as Headers,
            json: async () => res.json(),
            text: async () => res.text(),
            base64: async () => {
              const arrayBuffer = await res.arrayBuffer();
              return Buffer.from(arrayBuffer).toString('base64');
            },
            body: {
              getReader() {
                const bodyReader = res.body!.getReader();

                return {
                  async read() {
                    return bodyReader.read();
                  },
                };
              },
            } as ReadableStream,
          };
        }),
      __blocklet_quickjs_builtin__: {
        dumpResult: (resultKey, options) => {
          const scope = getScope(resultKey);

          function restoreReadableStream(object: any, path: (string | number)[] = []): any {
            if (object === '__AIGNE_LOGIC_RESULT_READABLE_STREAM__') {
              return new ReadableStream({
                start: (controller) => {
                  scope.readableStreamControllers[path.join('.')] = controller;
                },
              });
            }
            if (Array.isArray(object)) return object.map((i, index) => restoreReadableStream(i, [...path, index]));
            if (typeof object === 'object' && object) {
              return Object.fromEntries(
                Object.entries(object).map(([key, val]) => [key, restoreReadableStream(val, [...path, key])])
              );
            }

            return object;
          }

          if (options.type === 'result') {
            scope.result.resolve(restoreReadableStream(options.data));
          } else if (options.type === 'error') {
            const message =
              typeof options.error?.message === 'string' ? options.error.message : 'Error from QuickJS dumpResult';
            const error = new Error(message, { cause: options.error.stack });
            error.name = options.error.name;
            scope.result.reject(error);
          } else if (options.type === 'chunk') {
            const ctrl = scope.readableStreamControllers[options.path.join('.')];
            if (ctrl) {
              if (options.data.type === 'data') ctrl.enqueue(options.data.data);
              else if (options.data.type === 'error') ctrl.error(options.data.error);
              else if (options.data.type === 'done') ctrl.close();
            }
          }
        },
        textDecoderNew(...args) {
          const decoder = new TextDecoder(...args);
          const index = textDecoders.push(decoder) - 1;
          return index;
        },
        textDecoderDecode(index, ...args) {
          const decoder = textDecoders[index];
          if (!decoder) throw new Error(`TextDecoder ${index} not found`);
          return decoder.decode(new Uint8Array(args[0] as ArrayBuffer), args[1]);
        },
        joinURL,
        withQuery,
      },
    },
  };
}

export function setupBuiltinModules(context: QuickJSContext) {
  const { dumpResult, global } = builtinModule();

  setupGlobalVariables(context, global);

  return { dumpResult };
}

export function setupGlobalVariables(context: QuickJSContext, global: { [key: string]: any }) {
  for (const key in global) {
    toQuickJsObject(context, global[key]).consume((vars) => context.setProp(context.global, key, vars));
  }
}
