import remove from 'lodash/remove';
import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';

import { StreamTextOutputName, TYPES } from './constants';
import type { Context } from './context';
import { DataTypeSchema, SchemaMapType, schemaToDataType } from './data-type-schema';
import { LLMModel, LLMModelInputMessage, LLMModelInputs } from './llm-model';
import logger from './logger';
import { Memorable, MemoryMessage } from './memorable';
import {
  RunOptions,
  Runnable,
  RunnableDefinition,
  RunnableMemory,
  RunnableResponse,
  RunnableResponseStream,
} from './runnable';
import { isNonNullable, runnableResponseStreamToObject } from './utils';
import { mergeHistoryMessages } from './utils/message-utils';
import { renderMessage } from './utils/mustache-utils';
import { OrderedRecord } from './utils/ordered-map';
import { outputsToJsonSchema } from './utils/structured-output-schema';

@injectable()
export class LLMAgent<I extends Record<string, any> = {}, O extends {} = {}> extends Runnable<I, O> {
  static create<I extends { [name: string]: DataTypeSchema }, O extends { [name: string]: DataTypeSchema }>(
    options: Parameters<typeof createLLMAgentDefinition<I, O>>[0]
  ): LLMAgent<SchemaMapType<I>, SchemaMapType<O>> {
    const definition = createLLMAgentDefinition(options);

    return new LLMAgent(definition);
  }

  constructor(
    @inject(TYPES.definition) public override definition: LLMAgentDefinition,
    @inject(TYPES.llmModel) public model?: LLMModel,
    @inject(TYPES.context) public context?: Context
  ) {
    super(definition);
  }

  async run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: I, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    const { definition, model } = this;
    if (!model) throw new Error('LLM model is required');

    const { originalMessages, messagesWithMemory } = await this.prepareMessages(input);

    const llmInputs: LLMModelInputs = {
      messages: messagesWithMemory,
      modelOptions: definition.modelOptions,
    };

    const jsonOutput = this.runWithStructuredOutput(llmInputs);

    const textOutput = OrderedRecord.find(definition.outputs, (i) => i.name === StreamTextOutputName)
      ? await this.runWithTextOutput(llmInputs)
      : undefined;

    const updateMemories = (text?: string, json?: object) => {
      return this.updateMemories([
        ...originalMessages,
        { role: 'assistant', content: renderMessage('{{text}}\n{{json}}', { text, json }).trim() },
      ]);
    };

    if (options?.stream) {
      let $text = '';

      return new ReadableStream({
        start: async (controller) => {
          try {
            if (textOutput) {
              for await (const chunk of textOutput) {
                $text += chunk.$text || '';
                controller.enqueue({ $text: chunk.$text });
              }
            }

            const json = await jsonOutput;
            controller.enqueue({ delta: json });

            await updateMemories($text || undefined, json);
          } catch (error) {
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });
    }

    const [$text, json] = await Promise.all([
      textOutput ? runnableResponseStreamToObject(textOutput).then((res) => res.$text || undefined) : undefined,
      jsonOutput,
    ]);

    await updateMemories($text, json);

    return { $text, ...json };
  }

  private async prepareMessages(input: I) {
    const { definition } = this;

    const originalMessages = OrderedRecord.toArray(definition.messages).map(
      ({ role, content }): LLMModelInputMessage => ({
        role,
        // TODO: support use memory variables in message content
        content: typeof content === 'string' ? renderMessage(content, input) : content,
      })
    );
    if (!originalMessages.length) throw new Error('Messages are required');

    const { primaryMemory, memory } = await this.getMemories(input);

    let messagesWithMemory = [...originalMessages];

    // Add memory to a system message
    if (memory) {
      const message: LLMModelInputMessage = {
        role: 'system',
        content: `\
        Here are the memories about the user:
        ${memory}
        `,
      };

      const lastSystemMessageIndex = messagesWithMemory.findLastIndex((i) => i.role === 'assistant');
      messagesWithMemory.splice(lastSystemMessageIndex + 1, 0, message);
    }

    // Add primary memory to messages
    if (primaryMemory.length) messagesWithMemory = mergeHistoryMessages(messagesWithMemory, primaryMemory);

    // TODO: support comment/image for messages

    return { originalMessages, messagesWithMemory };
  }

  private async runWithStructuredOutput(llmInputs: LLMModelInputs) {
    const jsonOutputs = OrderedRecord.filter(
      this.definition.outputs,
      (i) => i.name !== StreamTextOutputName // ignore `$text` output
    );
    if (!jsonOutputs.length) return null;

    const schema = outputsToJsonSchema(OrderedRecord.fromArray(jsonOutputs));

    const { model } = this;
    if (!model) throw new Error('LLM model is required');

    const response = await model.run({
      ...llmInputs,
      responseFormat: {
        type: 'json_schema',
        jsonSchema: {
          name: 'output',
          schema: schema,
          strict: true,
        },
      },
    });

    if (!response.$text) throw new Error('No text in JSON mode response');

    const json = JSON.parse(response.$text);

    // TODO: validate json with outputJsonSchema

    return json;
  }

  private async runWithTextOutput(llmInputs: LLMModelInputs) {
    const { model } = this;
    if (!model) throw new Error('LLM model is required');

    return model.run(llmInputs, { stream: true });
  }

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

  private async getMemories(input: I): Promise<{
    primaryMemory: LLMModelInputMessage[];
    memory: string;
  }> {
    const { memories } = this.definition;
    const { userId, sessionId } = this.context?.state ?? {};

    const list = (
      await Promise.all(
        OrderedRecord.map(memories, async ({ id, memory, query, options }) => {
          if (!memory) {
            logger.warn(`Memory is not defined in agent ${this.name || this.id}`);
            return null;
          }

          const q = await this.getMemoryQuery(input, query);

          const { results: memories } = await memory.search(q, { ...options, userId, sessionId });

          return { id, memories };
        })
      )
    ).filter(isNonNullable);

    const primary = remove(list, (i) => i.id === this.definition.primaryMemoryId)[0]?.memories || [];

    const primaryMemory = primary
      .map((i) => {
        const content = renderMessage('{{memory}}', { memory: i.memory }).trim();
        const role = ['user', 'assistant'].includes(i.metadata.role) ? i.metadata.role : undefined;

        if (!role || !content) return null;

        return { role, content };
      })
      .filter(isNonNullable);

    const memory = list
      .map((i) =>
        i.memories
          .map((j) => renderMessage('{{memory}}\n{{metadata}}', j).trim() || null)
          .filter(isNonNullable)
          .join('\n')
      )
      .join('\n');

    return {
      primaryMemory,
      memory,
    };
  }

  /**
   * Update memories by user messages and assistant responses.
   * @param messages Messages to be added to memories.
   */
  private async updateMemories(messages: MemoryMessage[]): Promise<void> {
    const { memories } = this.definition;
    const { userId, sessionId } = this.context?.state ?? {};

    await Promise.all(
      OrderedRecord.map(memories, async ({ memory }) => {
        if (!memory) {
          logger.warn(`Memory is not defined in agent ${this.name || this.id}`);
          return;
        }

        return await memory.add(messages, { userId, sessionId });
      })
    );
  }
}

/**
 * Options to create LLMAgent.
 */
export interface CreateLLMAgentOptions<
  I extends { [name: string]: DataTypeSchema },
  O extends { [name: string]: DataTypeSchema },
> {
  /**
   * Agent name, used to identify the agent.
   */
  name?: string;

  /**
   * Input variables for this agent.
   */
  inputs: I;

  /**
   * Output variables for this agent.
   */
  outputs: O;

  /**
   * Memories to be used in this agent.
   */
  memories?: {
    /**
     * Memory name in this agent, it also the variable name representing this memory in whole agent.
     */
    name: string;

    /**
     * Memory instance to query/store memory.
     */
    memory: Memorable<any>;

    /**
     * Whether this memory is primary? Primary memory will be passed as messages to LLM chat model,
     * otherwise, it will be placed in a system message.
     *
     * Only one primary memory is allowed.
     */
    primary?: boolean;
    /**
     * Custom query to retrieve memory, if not provided, all input variables will be used.
     *
     * @example
     * {
     *   fromVariable: 'question' // question is a string input variable
     * }
     */

    /**
     * Custom query to retrieve memory, if not provided, all input variables will be used.
     */
    query?: {
      /**
       * Variable name from input used to query memory.
       */
      fromVariable?: keyof { [key in keyof I as I[key]['type'] extends 'string' ? key : never]: any };
    };

    /**
     * Custom options for memory query.
     */
    options?: {
      /**
       * Number of memories to retrieve.
       */
      k?: number;
    };
  }[];

  /**
   * Options for LLM chat model.
   */
  modelOptions?: LLMModelInputs['modelOptions'];

  /**
   * Messages to be passed to LLM chat model.
   */
  messages?: LLMModelInputMessage[];
}

/**
 * Create LLMAgent definition.
 * @param options Options to create LLMAgent.
 * @returns LLMAgent definition.
 */
export function createLLMAgentDefinition<
  I extends { [name: string]: DataTypeSchema },
  O extends { [name: string]: DataTypeSchema },
>(options: CreateLLMAgentOptions<I, O>): LLMAgentDefinition {
  const agentId = options.name || nanoid();

  const primaryMemories = options.memories?.filter((i) => i.primary);

  if (primaryMemories && primaryMemories.length > 1) {
    throw new Error('Only one primary memory is allowed');
  }

  const inputs = schemaToDataType(options.inputs);
  const outputs = schemaToDataType(options.outputs);

  const memories = OrderedRecord.fromArray<RunnableMemory>(
    options.memories?.map((i) => {
      const { name, memory, query, options } = i;

      const queryFromVariable = query?.fromVariable
        ? OrderedRecord.find(inputs, (j) => j.name === query.fromVariable)
        : null;
      if (query?.fromVariable && !queryFromVariable)
        throw new Error(
          `LLMAgent ${agentId} -> Memory ${name} -> Query variable ${query.fromVariable.toString()} not found`
        );

      return {
        id: name || nanoid(),
        name: name,
        memory: memory,
        query: queryFromVariable ? { from: 'variable', fromVariableId: queryFromVariable.id } : undefined,
        options,
      };
    })
  );

  const messages = OrderedRecord.fromArray(
    options.messages?.map((i) => ({
      id: nanoid(),
      role: i.role,
      content: i.content,
    }))
  );

  return {
    id: agentId,
    name: options.name,
    type: 'llm_agent',
    inputs,
    outputs,
    primaryMemoryId: primaryMemories?.at(0)?.name,
    memories,
    modelOptions: options.modelOptions,
    messages,
  };
}

export interface LLMAgentDefinition extends RunnableDefinition {
  type: 'llm_agent';

  primaryMemoryId?: string;

  messages?: OrderedRecord<LLMModelInputMessage & { id: string }>;

  modelOptions?: LLMModelInputs['modelOptions'];
}
