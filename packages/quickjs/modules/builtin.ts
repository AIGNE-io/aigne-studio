import { ReadableStream } from 'stream';

export async function dumpResult(resultKey: string, r: any) {
  try {
    const result = await r;

    const { value, promise } = marshalReadableStream(resultKey, result);
    __blocklet_quickjs_builtin__.dumpResult(resultKey, { type: 'result', data: value });

    return await promise;
  } catch (error) {
    __blocklet_quickjs_builtin__.dumpResult(resultKey, {
      type: 'error',
      error: { message: error.message, stack: error.stack },
    });
    throw error;
  }
}

function marshalReadableStream(
  resultKey: string,
  object: any,
  path: (string | number)[] = []
): { value: any; promise?: Promise<any> } {
  if (object instanceof ReadableStream) {
    return {
      value: '__AIGNE_LOGIC_RESULT_READABLE_STREAM__',
      promise: (async () => {
        try {
          for await (const i of object) {
            __blocklet_quickjs_builtin__.dumpResult(resultKey, {
              type: 'chunk',
              path,
              data: { type: 'data', data: i },
            });
          }
        } catch (error) {
          __blocklet_quickjs_builtin__.dumpResult(resultKey, { type: 'chunk', path, data: { type: 'error', error } });
        }
        __blocklet_quickjs_builtin__.dumpResult(resultKey, { type: 'chunk', path, data: { type: 'done' } });
      })(),
    };
  }

  if (Array.isArray(object)) {
    const arr = object.map((i, index) => marshalReadableStream(resultKey, i, [...path, index]));
    const promises = arr.map((i) => i.promise).filter((i) => !!i);
    return {
      value: arr.map((i) => i.value),
      promise: promises.length ? Promise.all(promises) : undefined,
    };
  }

  if (typeof object === 'object' && object) {
    const entries = Object.entries(object).map(
      ([key, val]) => [key, marshalReadableStream(resultKey, val, [...path, key])] as const
    );
    const promises = entries.map((i) => i[1].promise).filter((i) => !!i);
    return {
      value: Object.fromEntries(entries.map(([key, val]) => [key, val.value])),
      promise: promises.length ? Promise.all(promises) : undefined,
    };
  }

  return { value: object };
}
