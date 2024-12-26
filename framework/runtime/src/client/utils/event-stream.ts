import { RunnableResponseDelta } from '@aigne/core';
import { createParser } from 'eventsource-parser';

import logger from '../../logger';

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
              logger.error('parse chunk error', { error, data: event.data });
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

export class RunnableStreamParser<O> extends TransformStream<RunnableResponseDelta<O>, RunnableResponseDelta<O>> {
  private $text = '';

  private delta = {};

  constructor() {
    super({
      transform: (chunk, controller) => {
        if (typeof chunk.$text === 'string' && chunk.$text) {
          this.$text += chunk.$text;
        }

        Object.assign(this.delta, { $text: this.$text || undefined }, chunk.delta);

        controller.enqueue({ ...chunk, delta: { ...this.delta } });
      },
    });
  }
}
