import {
  IVectorStoreManager,
  OrderedRecord,
  RunOptions,
  Runnable,
  RunnableResponse,
  RunnableResponseStream,
} from '@aigne/core';
import { uniqBy } from 'lodash';

import nextId from '../lib/next-id';
import { getUpdateMemoryMessages } from '../lib/prompts';
import { getFactRetrievalMessages, parseMessages } from '../lib/utils';
import { objectToStream } from '../lib/utils';
import OpenAIManager from '../llm/openai';
import logger from '../logger';

export class CustomAgent<
  T extends {
    messages: { role: string; content: string }[];
    userId?: string;
    sessionId?: string;
    metadata?: { [key: string]: any };
  },
  O extends object,
> extends Runnable<T, O> {
  vectorStoreProvider: IVectorStoreManager;
  llm: OpenAIManager;
  customPrompt?: string;

  constructor(vectorStoreProvider: IVectorStoreManager, llm: OpenAIManager, customPrompt?: string) {
    super({
      id: 'custom_memory_agent',
      type: 'custom_memory_agent',
      name: 'Custom Memory Agent',
      description: 'Custom Memory Agent',
      inputs: OrderedRecord.fromArray([]),
      outputs: OrderedRecord.fromArray([]),
    });

    this.vectorStoreProvider = vectorStoreProvider;
    this.llm = llm;
    this.customPrompt = customPrompt;
  }

  async run(input: T, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: T, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: T, options?: RunOptions): Promise<RunnableResponse<O>> {
    const run = async () => {
      const { messages, metadata } = input;

      const vectorStoreProvider = this.vectorStoreProvider;
      if (!vectorStoreProvider) throw new Error('Vector store not initialized');

      const llm = this.llm;
      if (!llm) throw new Error('LLM not initialized');

      const parsedMessages = parseMessages(messages);
      let systemPrompt: string;
      let userPrompt: string;

      if (this.customPrompt) {
        systemPrompt = this.customPrompt;
        userPrompt = `Input: ${parsedMessages}`;
      } else {
        [systemPrompt, userPrompt] = getFactRetrievalMessages(parsedMessages);
      }

      const response = await llm.create<{ facts: string[] }>({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        responseFormat: {
          type: 'json_schema',
          jsonSchema: {
            name: 'facts_schema',
            schema: {
              type: 'object',
              properties: {
                facts: {
                  type: 'array',
                  description: 'Array of extracted facts from the input text',
                  items: {
                    type: 'string',
                  },
                },
              },
              additionalProperties: false,
              required: ['facts'],
            },
          },
        },
      });

      const newRetrievedFacts = response.facts || [];
      let retrievedOldMemory: { id: string; text: string }[] = [];

      logger.info('newRetrievedFacts', { newRetrievedFacts });

      for (const fact of newRetrievedFacts) {
        const existingMemories = await vectorStoreProvider.search(fact, 5, metadata).catch((e) => {
          return [];
        });

        logger.info('Existing Memories', { existingMemories: JSON.stringify(existingMemories, null, 2) });

        for (const memory of existingMemories) {
          if (memory.metadata.memoryId) {
            retrievedOldMemory.push({ id: memory.metadata.memoryId, text: memory.pageContent });
          }
        }
      }
      retrievedOldMemory = uniqBy(retrievedOldMemory, 'id');

      logger.info('Total existing memories', { retrievedOldMemory, count: retrievedOldMemory.length });

      // mapping UUIDs with integers for handling UUID hallucinations
      const tempUuidMapping: Record<string, string> = {};
      retrievedOldMemory.forEach((item, idx) => {
        if (item.id) {
          const idxStr = idx.toString();
          tempUuidMapping[idxStr] = item.id;
          retrievedOldMemory[idx].id = idxStr;
        }
      });

      const funcCallingPrompt = getUpdateMemoryMessages(retrievedOldMemory, newRetrievedFacts);
      const newMemoriesWithActions = await llm.create<{
        memory: { id: string; text: string; event: string; old_memory?: string }[];
      }>({
        messages: [{ role: 'user', content: funcCallingPrompt }],
        responseFormat: {
          type: 'json_schema',
          jsonSchema: {
            name: 'memory_schema',
            schema: {
              type: 'object',
              properties: {
                memory: {
                  type: 'array',
                  description: 'Array of memory operations and their details',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        description: 'Memory entry identifier from 0 to n',
                      },
                      text: {
                        type: 'string',
                        description: 'Content of the memory',
                      },
                      event: {
                        type: 'string',
                        enum: ['ADD', 'UPDATE', 'DELETE', 'NONE'],
                        description: 'Type of memory operation',
                      },
                      old_memory: {
                        type: 'string',
                        description: 'Previous content for UPDATE operations',
                        optional: true,
                      },
                    },
                    required: ['id', 'text', 'event'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['memory'],
              additionalProperties: false,
            },
          },
        },
      });

      return newMemoriesWithActions.memory.map((m: { id: string; text: string; event: string }) => ({
        id: tempUuidMapping[m.id] ?? nextId(),
        memory: m.text,
        event: (m.event || '').toLowerCase(),
      })) as O;
    };
    const result = await run();

    if (options?.stream) {
      return new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue({ delta: result });
          } catch (error) {
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });
    }

    return options?.stream ? objectToStream({ delta: result }) : result;
  }
}
