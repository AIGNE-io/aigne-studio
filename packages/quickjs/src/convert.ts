import { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';

import { logger } from './logger';

export function toQuickJsObject(vm: QuickJSContext, object: any): QuickJSHandle {
  if (typeof object === 'string') return vm.newString(object);
  if (typeof object === 'number') return vm.newNumber(object);
  if (typeof object === 'boolean') return object ? vm.true : vm.false;
  if (typeof object === 'symbol' && object.description) return vm.newSymbolFor(object.description);
  if (object === null) return vm.null;
  if (object === undefined) return vm.undefined;

  if (object instanceof Uint8Array) {
    return vm.newArrayBuffer(object.buffer);
  }

  if (object instanceof ArrayBuffer) {
    return vm.newArrayBuffer(object);
  }

  if (Array.isArray(object)) {
    const arr = vm.newArray();
    for (let i = 0; i < object.length; i++) {
      toQuickJsObject(vm, object[i]).consume((o) => vm.setProp(arr, i, o));
    }
    return arr;
  }

  if (typeof object === 'object') {
    const obj = vm.newObject();
    for (const key in object) {
      toQuickJsObject(vm, object[key]).consume((o) => vm.setProp(obj, key, o));
    }
    return obj;
  }

  if (typeof object === 'function') {
    return vm.newFunction(object.name, (...args: any[]) => {
      const result = object(
        ...args.map((arg) => {
          if (vm.typeof(arg) === 'object') {
            // @ts-ignore
            const ptr = vm.ffi.QTS_GetArrayBuffer(vm.ctx.value, arg.value);
            // NOTE: copy a new Uint8Array to avoid memory leak
            if (ptr) return vm.getArrayBuffer(arg).consume((v) => new Uint8Array(v.value));
          }
          return vm.dump(arg);
        })
      );

      if (!(result instanceof Promise)) {
        return toQuickJsObject(vm, result);
      }

      const promise = vm.newPromise();
      promise.settled.then(() => {
        if (vm.alive) vm.runtime.executePendingJobs().unwrap();
      });

      result
        .then((value) => {
          toQuickJsObject(vm, value).consume((value) => promise.resolve(value));
        })
        .catch((error) => {
          vm.newError({ name: error.name, message: error.message }).consume((error) => promise.reject(error));
        })
        .catch((error) => {
          logger.error('return promise to quick js error', error);
        });

      return promise.handle;
    });
  }

  throw new Error(`Unsupported data type to quick js ${typeof object}`);
}
