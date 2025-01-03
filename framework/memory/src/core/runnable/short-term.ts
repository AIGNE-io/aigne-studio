import {
  LLMModel,
  MemoryActionItem,
  MemoryRunner,
  MemoryRunnerInputs,
  RunOptions,
  RunnableResponse,
  RunnableResponseStream,
} from '@aigne/core';
import { uniqBy } from 'lodash';

import nextId from '../../lib/next-id';
import { getUpdateMemoryMessages } from '../../lib/prompts';
import { getFactRetrievalMessages, objectToStream, parseMessages } from '../../lib/utils';
import logger from '../../logger';
import { Retrievable } from '../type';

export type ShortTermRunnableOutput = MemoryActionItem<string>[];

export class ShortTermRunnable extends MemoryRunner<string, ShortTermRunnableOutput> {
  vectorStore?: Retrievable<string>;

  constructor(public llmModel: LLMModel) {
    super('short_term');
  }

  private async _run(input: MemoryRunnerInputs): Promise<ShortTermRunnableOutput> {
    const { messages, filter } = input;

    // TODO: vectorStore should be initialized in the constructor
    const { vectorStore } = this;
    if (!vectorStore) throw new Error('Vector store not initialized');

    const parsedMessages = parseMessages(messages);
    const [systemPrompt, userPrompt] = getFactRetrievalMessages(parsedMessages);

    const response = await this.llmModel.run({
      modelSettings: {
        model: 'gpt-4o-mini',
        temperature: 0.3,
      },
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

    if (!response.$text) throw new Error('No response from LLM');

    const newRetrievedFacts: string[] = JSON.parse(response.$text).facts;
    logger.debug('newRetrievedFacts', { newRetrievedFacts });

    const allExistingMemories = await Promise.all(newRetrievedFacts.map((fact) => vectorStore.search(fact, 5, filter)));

    const retrievedOldMemories = uniqBy(
      allExistingMemories.flatMap((existingMemories) => {
        return existingMemories.map((memory) => ({
          id: memory.metadata.memoryId,
          text: memory.memory,
        }));
      }),
      'id'
    );

    logger.debug('Retrieved Old Memories', retrievedOldMemories);

    // mapping UUIDs with integers for handling UUID hallucinations
    const tempUuidMapping: Record<string, string> = {};
    retrievedOldMemories.forEach((item, idx) => {
      if (item.id) {
        const idxStr = idx.toString();
        tempUuidMapping[idxStr] = item.id;
        item.id = idxStr;
      }
    });

    const funcCallingPrompt = getUpdateMemoryMessages(retrievedOldMemories, newRetrievedFacts);

    const newMemoriesWithActions = await this.llmModel.run({
      modelSettings: {
        model: 'gpt-4o-mini',
        temperature: 0.3,
      },
      messages: [{ role: 'system', content: funcCallingPrompt }],
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
                      enum: ['add', 'update', 'delete', 'none'],
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
          strict: true,
        },
      },
    });

    if (!newMemoriesWithActions.$text) throw new Error('No response from LLM');

    const result: {
      memory: { id: string; text: string; event: 'add' | 'update' | 'delete' | 'none'; old_memory?: string }[];
    } = JSON.parse(newMemoriesWithActions.$text);

    return result.memory.map<ShortTermRunnableOutput[number]>((m) => ({
      id: tempUuidMapping[m.id],
      memory: m.text,
      event: m.event as any,
    }));
  }

  async run(
    input: MemoryRunnerInputs,
    options: RunOptions & { stream: true }
  ): Promise<RunnableResponseStream<ShortTermRunnableOutput>>;
  async run(input: MemoryRunnerInputs, options?: RunOptions & { stream?: false }): Promise<ShortTermRunnableOutput>;
  async run(input: MemoryRunnerInputs, options?: RunOptions): Promise<RunnableResponse<ShortTermRunnableOutput>> {
    const result = await this._run(input);

    return options?.stream ? objectToStream({ delta: result }) : result;
  }
}
