/// <reference path="../global.d.ts" />

import { QuickJSContext } from 'quickjs-emscripten';
import { joinURL, withQuery } from 'ufo';

import { toQuickJsObject } from './convert';

function builtinModule(): {
  resultPromise: Promise<any>;
  builtin: BlockletQuickJSBuiltin;
} {
  const textDecoders: TextDecoder[] = [];
  const readableStreamControllers: { [key: string]: ReadableStreamController<any> } = {};

  const resultPromise = Promise.withResolvers<any>();

  function restoreReadableStream(object: any, path: (string | number)[] = []): any {
    if (object === '__AIGNE_LOGIC_RESULT_READABLE_STREAM__') {
      return new ReadableStream({
        start: (controller) => {
          readableStreamControllers[path.join('.')] = controller;
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

  return {
    resultPromise: resultPromise.promise,
    builtin: {
      dumpResult: (options) => {
        if (options.type === 'result') {
          resultPromise.resolve(restoreReadableStream(options.data));
        } else if (options.type === 'error') {
          const message =
            typeof options.error?.message === 'string' ? options.error.message : 'Error from QuickJS dumpResult';
          const error = new Error(message);
          error.stack = options.error.stack;
          resultPromise.reject(error);
        } else if (options.type === 'chunk') {
          const ctrl = readableStreamControllers[options.path.join('.')];
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
      joinURL,
      withQuery,
    },
  };
}

export function setupBuiltinModules(context: QuickJSContext) {
  const { resultPromise, builtin } = builtinModule();

  toQuickJsObject(context, builtin).consume((builtin) =>
    context.setProp(context.global, '__blocklet_quickjs_builtin__', builtin)
  );

  return { resultPromise };
}

export function setupGlobalVariables(context: QuickJSContext, global: { [key: string]: any }) {
  for (const key in global) {
    toQuickJsObject(context, global[key]).consume((vars) => context.setProp(context.global, key, vars));
  }
}
