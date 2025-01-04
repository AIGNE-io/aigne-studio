import {
  MemoryActionItem,
  MemoryRunner,
  MemoryRunnerInput,
  RunOptions,
  RunnableResponse,
  RunnableResponseStream,
  objectToStream,
} from '@aigne/core';

import nextId from '../lib/next-id';

export type LongTermMemoryRunnerOutput = MemoryActionItem<string>[];

export class LongTermMemoryRunner extends MemoryRunner<string> {
  constructor() {
    super('long_term_memory');
  }

  async run(
    input: MemoryRunnerInput,
    options: RunOptions & { stream: true }
  ): Promise<RunnableResponseStream<LongTermMemoryRunnerOutput>>;
  async run(input: MemoryRunnerInput, options?: RunOptions & { stream?: false }): Promise<LongTermMemoryRunnerOutput>;
  async run(input: MemoryRunnerInput, options?: RunOptions): Promise<RunnableResponse<LongTermMemoryRunnerOutput>> {
    const { messages } = input;

    const result: LongTermMemoryRunnerOutput = messages.map((message) => {
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
