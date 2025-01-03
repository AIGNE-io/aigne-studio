import {
  MemoryActionItem,
  MemoryRunner,
  MemoryRunnerInputs,
  RunOptions,
  RunnableResponse,
  RunnableResponseStream,
} from '@aigne/core';

import nextId from '../../lib/next-id';
import { objectToStream } from '../../lib/utils';

export type LongTermRunnableOutput = MemoryActionItem<string>[];

export class LongTermRunnable extends MemoryRunner<string, LongTermRunnableOutput> {
  constructor() {
    super('long_term');
  }

  async run(
    input: MemoryRunnerInputs,
    options: RunOptions & { stream: true }
  ): Promise<RunnableResponseStream<LongTermRunnableOutput>>;
  async run(input: MemoryRunnerInputs, options?: RunOptions & { stream?: false }): Promise<LongTermRunnableOutput>;
  async run(input: MemoryRunnerInputs, options?: RunOptions): Promise<RunnableResponse<LongTermRunnableOutput>> {
    const { messages } = input;

    const result: LongTermRunnableOutput = messages.map((message) => {
      return {
        id: nextId(),
        event: 'add',
        memory: message.content,
        metadata: { role: message.role },
      };
    });

    return options?.stream ? objectToStream({ delta: result }) : result;
  }
}
