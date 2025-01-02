import {
  MemoryActionItem,
  MemoryRunnable,
  MemoryRunnableInputs,
  RunOptions,
  RunnableResponse,
  RunnableResponseStream,
} from '@aigne/core';

import nextId from '../../lib/next-id';
import { objectToStream } from '../../lib/utils';

export class LongTermRunnable<
  T extends string = string,
  O extends MemoryActionItem<T>[] = MemoryActionItem<T>[],
> extends MemoryRunnable<T, O> {
  constructor() {
    super('long_term');
  }

  async run(input: MemoryRunnableInputs, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: MemoryRunnableInputs, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: MemoryRunnableInputs, options?: RunOptions): Promise<RunnableResponse<O>> {
    const { messages } = input;

    const result = messages.map((message) => {
      return {
        id: nextId(),
        event: 'add',
        memory: message.content,
        metadata: { role: message.role },
      };
    }) as unknown as O;

    return options?.stream ? objectToStream({ delta: result }) : result;
  }
}
