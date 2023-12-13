import { ReadableStream, TransformStream } from 'stream/web';

import { createParser } from 'eventsource-parser';

export class ReadableStreamFromNodeJs extends ReadableStream<Buffer> {
  constructor(stream: NodeJS.ReadableStream) {
    super({
      start: (controller) => {
        setTimeout(async () => {
          for await (const chunk of stream) {
            controller.enqueue(chunk as Buffer);
          }
          controller.close();
        });
      },
    });
  }
}

export class EventSourceParserStream extends TransformStream<any, { data?: string }> {
  constructor() {
    let parser: ReturnType<typeof createParser> | undefined;

    super({
      start(controller) {
        parser = createParser((event) => {
          if (event.type === 'event') {
            controller.enqueue(event);
          }
        });
      },
      transform(chunk) {
        parser?.feed(chunk);
      },
    });
  }
}
