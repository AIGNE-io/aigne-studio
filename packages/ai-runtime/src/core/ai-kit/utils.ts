import { TransformStream } from 'stream/web';

import { createParser } from 'eventsource-parser';

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
