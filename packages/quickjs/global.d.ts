declare interface BlockletQuickJSBuiltin {
  dumpResult(
    resultKey: string,
    options:
      | { type: 'result'; data: any }
      | { type: 'error'; error: { name: string; message: string; stack: string } }
      | {
          type: 'chunk';
          path: (string | number)[];
          data: { type: 'data'; data: any } | { type: 'error'; error: any } | { type: 'done' };
        }
  );

  textDecoderNew(): number;
  textDecoderDecode(id: number, ...args: Parameters<InstanceType<typeof TextDecoder>['decode']>);

  fetch(
    ...args: Parameters<typeof globalThis.fetch>
  ): Promise<Pick<Response, 'ok' | 'status' | 'statusText' | 'headers' | 'url' | 'text' | 'json' | 'body'>>;

  joinURL: typeof import('ufo').joinURL;

  withQuery: typeof import('ufo').withQuery;
}

declare var __blocklet_quickjs_builtin__: BlockletQuickJSBuiltin;

declare module 'stream' {
  import { NativeReadableStream } from 'stream/web';

  export { ReadableStream };
}

declare module 'util' {
  import { TextDecoder } from 'util';

  export { TextDecoder };
}

declare module 'eventsource-parser' {
  export function createParser(listener: (event: any) => void): {
    feed(chunk: any): void;
  };
}
