import { Context, ContextState } from './context';
import logger from './logger';
import { MemoryItemWithScore, MemoryMessage } from './memorable';
import { RunOptions, Runnable, RunnableMemory, RunnableResponse, RunnableResponseStream } from './runnable';
import { OrderedRecord, isNonNullable, renderMessage } from './utils';

export interface AgentProcessOptions<Memories extends { [name: string]: MemoryItemWithScore[] }> extends RunOptions {
  memories: Memories;
}

export abstract class Agent<
  I extends { [key: string]: any } = {},
  O extends { [key: string]: any } = {},
  Memories extends { [name: string]: MemoryItemWithScore[] } = {},
  State extends ContextState = ContextState,
> extends Runnable<I, O, State> {
  private async getMemoryQuery(input: I, query: RunnableMemory['query']): Promise<string> {
    if (query?.from === 'variable') {
      const i = OrderedRecord.find(this.definition.inputs, (i) => i.id === query.fromVariableId);
      if (!i) throw new Error(`Input variable ${query.fromVariableId} not found`);

      const value = input[i.name!];
      return renderMessage('{{value}}', { value });
    }

    return Object.entries(input)
      .map(([key, value]) => `${key} ${value}`)
      .join('\n');
  }

  /**
   * Load memories that are defined in the agent definition.
   * @param input The agent input.
   * @param context The AIGNE context.
   * @returns A dictionary of memories, where the key is the memory id or name and the value is an array of memory items.
   */
  protected async loadMemories(input: I, context?: Context): Promise<Memories> {
    const { memories } = this.definition;
    const { userId, sessionId } = context?.state ?? {};

    return Object.fromEntries(
      (
        await Promise.all(
          OrderedRecord.map(memories, async ({ id, name, memory, query, options }) => {
            if (!name || !memory) return null;

            const q = await this.getMemoryQuery(input, query);

            const { results: memories } = await memory.search(q, { ...options, userId, sessionId });

            return [
              [id, memories],
              [name, memories],
            ];
          })
        )
      )
        .flat()
        .filter(isNonNullable)
    );
  }

  /**
   * Update memories by user messages and assistant responses.
   * @param messages Messages to be added to memories.
   */
  protected async updateMemories(messages: MemoryMessage[]): Promise<void> {
    const { memories } = this.definition;
    const { userId, sessionId } = this.context?.state ?? {};

    await Promise.all(
      OrderedRecord.map(memories, async ({ memory }) => {
        if (!memory) {
          logger.warn(`Memory is not defined in agent ${this.name || this.id}`);
          return;
        }

        await memory.add(messages, { userId, sessionId });
      })
    );
  }

  async run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: I, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    const memories = await this.loadMemories(input, this.context);

    return this.process(input, { ...options, memories });
  }

  abstract process(
    input: I,
    options: AgentProcessOptions<Memories> & { stream: true }
  ): Promise<RunnableResponseStream<O>>;
  abstract process(input: I, options: AgentProcessOptions<Memories> & { stream?: false }): Promise<O>;
  abstract process(input: I, options: AgentProcessOptions<Memories>): Promise<RunnableResponse<O>>;
}
