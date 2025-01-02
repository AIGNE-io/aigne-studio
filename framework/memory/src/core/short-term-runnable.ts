import {
  LLMModel,
  MemoryActionItem,
  MemoryRunnable,
  MemoryRunnableInputs,
  RunOptions,
  RunnableResponse,
  RunnableResponseStream,
} from '@aigne/core';
import { uniqBy } from 'lodash';

import nextId from '../lib/next-id';
import { getUpdateMemoryMessages } from '../lib/prompts';
import { getFactRetrievalMessages, objectToStream, parseMessages } from '../lib/utils';
import logger from '../logger';
import { IVectorStoreManager } from '../types/memory';

export class ShortTermRunnable<
  T extends string = string,
  O extends MemoryActionItem<T>[] = MemoryActionItem<T>[],
> extends MemoryRunnable<T, O> {
  vectorStoreProvider?: IVectorStoreManager;

  llm: LLMModel;

  constructor(llm: LLMModel) {
    super('short_term');
    this.llm = llm;
  }

  setVectorStoreProvider(vectorStoreProvider: IVectorStoreManager) {
    this.vectorStoreProvider = vectorStoreProvider;
  }

  private async _run(input: MemoryRunnableInputs): Promise<O> {
    const { messages, filters } = input;

    const { vectorStoreProvider } = this;
    if (!vectorStoreProvider) throw new Error('Vector store not initialized');

    const { llm } = this;
    if (!llm) throw new Error('LLM not initialized');

    const parsedMessages = parseMessages(messages);
    const [systemPrompt, userPrompt] = getFactRetrievalMessages(parsedMessages);

    const response = await llm.run({
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

    const newRetrievedFacts = response?.$text ? JSON.parse(response.$text).facts : [];
    logger.info('newRetrievedFacts', { newRetrievedFacts });

    const searchPromises = newRetrievedFacts.map((fact: string) =>
      vectorStoreProvider.search(fact, 5, filters).catch((e) => [])
    );
    const allExistingMemories = await Promise.all(searchPromises);
    const retrievedOldMemory = uniqBy(
      allExistingMemories.flatMap((existingMemories) => {
        logger.info('Existing Memories', {
          existingMemories: JSON.stringify(existingMemories, null, 2),
        });

        return existingMemories
          .filter((memory: any) => memory.metadata.memoryId)
          .map((memory: any) => ({
            id: memory.metadata.memoryId,
            text: memory.pageContent,
          }));
      }),
      'id'
    );

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
    const newMemoriesWithActions = await llm.run({
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

    const memory = newMemoriesWithActions?.$text ? JSON.parse(newMemoriesWithActions.$text) : {};
    return (memory.memory || []).map((m: { id: string; text: string; event: string }) => ({
      id: tempUuidMapping[m.id] ?? nextId(),
      memory: m.text,
      event: (m.event || '').toLowerCase(),
    }));
  }

  async run(input: MemoryRunnableInputs, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: MemoryRunnableInputs, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: MemoryRunnableInputs, options?: RunOptions): Promise<RunnableResponse<O>> {
    const result = await this._run(input);

    return options?.stream ? objectToStream({ delta: result }) : result;
  }
}
