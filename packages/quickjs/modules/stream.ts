import { TextDecoder } from 'util';

// eslint-disable-next-line import/no-extraneous-dependencies
import { createParser } from 'eventsource-parser';

export class ReadableStream<R> {
  constructor(public options: UnderlyingSource<R>) {
    this.controller = {
      desiredSize: null,
      enqueue: (value: R) => {
        if (this.closed) throw new Error('can not write to a closed stream');
        this.buffer.push({ value: { data: value } });
        this.readerPromise.resolve();
        this.readerPromise = Promise.withResolvers();
      },
      close: () => {
        this.closed = true;
        this.readerPromise.resolve();
        this.readerPromise = Promise.withResolvers();
      },
      error: (error?: any) => {
        if (this.closed) throw new Error('can not write to a closed stream');
        this.buffer.push({ error: { data: error } });
        this.readerPromise.resolve();
        this.readerPromise = Promise.withResolvers();
      },
    };
  }

  controller: ReadableStreamDefaultController<R>;

  private buffer: { value?: { data: R }; error?: { data?: any } }[] = [];

  private closed = false;

  private reader?: ReadableStreamDefaultReader<R>;

  private readerPromise = Promise.withResolvers<void>();

  getReader() {
    this.options.start?.(this.controller);

    this.reader ??= {
      read: async () => {
        const data = this.buffer.shift();
        if (data) {
          if (data.error) throw data.error.data;
          return { value: data.value!.data, done: false };
        }
        if (this.closed) return { done: true };

        await this.readerPromise.promise;

        return this.reader!.read();
      },
      releaseLock: () => {
        throw new Error('Unimplemented method `releaseLock`');
      },
      closed: Promise.reject(new Error('Unimplemented `closed`')),
      cancel: async () => {
        throw new Error('Unimplemented method `cancel`');
      },
    } as any;

    return this.reader!;
  }

  pipeThrough<T>(transformStream: TransformStream<R, T>) {
    const reader = this.getReader();
    const writer = transformStream.writable.getWriter();

    const pump = () => {
      return reader.read().then(({ done, value }) => {
        if (done) {
          writer.close(); // Close the writable stream when we're done
          return;
        }
        writer.write(value); // Write the chunk to the writable side of the transform stream
        pump(); // Continue reading and writing
      });
    };

    pump(); // Start the reading-writing process

    return transformStream.readable; // Return the readable side of the transform stream
  }

  async *[Symbol.asyncIterator]() {
    const reader = this.getReader();
    for (;;) {
      const data = await reader.read();
      if (data.done) return;
      yield data.value;
    }
  }
}

class WritableStream<T> {
  constructor(public options: UnderlyingSink<T>) {}

  private isClosed = false;

  private isAborted = false;

  private error?: Error;

  private abortController = {
    abort: (reason?: any) => {
      throw reason || new Error('Unimplemented method `abort`');
    },
    signal: {} as any,
  };

  private controller: WritableStreamDefaultController = {
    signal: this.abortController.signal,
    error: (e) => (this.error = e),
  };

  getWriter(): WritableStreamDefaultWriter<T> {
    return {
      closed: Promise.reject(new Error('Unimplemented property `closed`')),
      ready: Promise.resolve(undefined),
      desiredSize: null,
      abort: async (reason?: any) => this.abort(reason),
      close: () => this.close(),
      releaseLock: () => {
        throw new Error('Unimplemented method `releaseLock');
      },
      write: async (chunk: T) => {
        if (this.error) throw this.error;
        if (this.isClosed) throw new Error('Stream is already closed.');
        if (this.isAborted) throw new Error('Stream has been aborted, cannot close.');

        await this.options.write?.(chunk, this.controller);
      },
    };
  }

  async close() {
    if (this.error) throw this.error;
    if (this.isClosed) throw new Error('Stream is already closed, cannot abort.');
    if (this.isAborted) throw new Error('Stream has already been aborted.');

    this.isClosed = true;
    await this.options.close?.();
  }

  async abort(reason: any) {
    if (this.error) throw this.error;
    if (this.isClosed) throw new Error('Stream is already closed, cannot abort.');
    if (this.isAborted) throw new Error('Stream has already been aborted.');

    this.isAborted = true;
    this.abortController.abort(reason);
  }
}

export class TransformStream<I, O> {
  constructor(public options: Transformer<I, O>) {
    options.start?.(this.controller);
  }

  readable = new ReadableStream<O>({});

  controller: TransformStreamDefaultController<O> = {
    enqueue: (chunk) => this.readable.controller.enqueue(chunk),
    terminate: () => this.readable.controller.close(),
    error: (error) => this.readable.controller.error(error),
    desiredSize: null,
  };

  writable = new WritableStream<I>({
    write: (chunk) => {
      return this.options.transform?.(chunk, this.controller);
    },
    close: async () => {
      await this.options.flush?.(this.controller);
      this.readable.controller.close();
    },
  });

  async *[Symbol.asyncIterator]() {
    const reader = this.readable.getReader();
    for (;;) {
      const data = await reader.read();
      if (data.done) return;
      yield data.value;
    }
  }
}

export class TextDecoderStream extends TransformStream<Uint8Array, string> {
  constructor() {
    const decoder = new TextDecoder();

    super({
      transform(chunk, controller) {
        controller.enqueue(decoder.decode(chunk, { stream: true }));
      },
      flush(controller) {
        controller.enqueue(decoder.decode(new ArrayBuffer(0)));
      },
    });
  }
}

export class EventSourceParserStream<T> extends TransformStream<any, T> {
  constructor() {
    let parser: ReturnType<typeof createParser> | undefined;

    super({
      start(controller) {
        parser = createParser((event) => {
          if (event.type === 'event') {
            try {
              const json = JSON.parse(event.data) as T;
              controller.enqueue(json);
            } catch (error) {
              console.error('parse chunk error', { error, data: event.data });
            }
          }
        });
      },
      transform(chunk) {
        parser?.feed(chunk);
      },
    });
  }
}
