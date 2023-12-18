import { Readable } from 'stream';
import { ReadableStream, TransformStream } from 'stream/web';

import { createParser } from 'eventsource-parser';

export function readableToWeb(readable: Readable) {
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of readable) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
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
