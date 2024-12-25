import { createHash } from 'crypto';

import {
  IMemory,
  IStorageManager,
  IVectorStoreManager,
  MemoryActionItem,
  MemoryActions,
  MemoryItem,
  RunOptions,
  Runnable,
  RunnableResponse,
  RunnableResponseStream,
  SearchMemoryItem,
} from '@aigne/core';
// import { chatCompletions } from '@blocklet/ai-kit/api/call';
import { mkdir, pathExists } from 'fs-extra';
import { cloneDeep, uniqBy } from 'lodash';
import { joinURL } from 'ufo';

import nextId from '../lib/next-id';
import { getUpdateMemoryMessages } from '../lib/prompts';
import { generateStructuredResponse, getFactRetrievalMessages, parseMessages } from '../lib/utils';
import OpenAIManager from '../llm/openai';
import logger from '../logger';
import SQLiteManager from '../storage/sqlite';
import VectorStoreManager from '../vector-stores/search-kit';

const apiKey = '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';

export class Memory<T extends string, O extends MemoryActions<T>> implements IMemory<T> {
  memoryPath: string = '';

  llm?: OpenAIManager;
  db?: IStorageManager;
  vectorStoreProvider?: IVectorStoreManager;
  customRunnable?: Runnable<
    {
      messages: { role: string; content: string }[];
      userId?: string;
      sessionId?: string;
      metadata?: { [key: string]: any };
    },
    MemoryActionItem<T>[]
  >;
  customPrompt?: string;

  static async load(config: {
    path: string;
    vectorStoreProvider?: IVectorStoreManager;
    llm?: OpenAIManager;
    db?: IStorageManager;
    customRunnable?: Runnable<
      {
        messages: { role: string; content: string }[];
        userId?: string;
        sessionId?: string;
        metadata?: { [key: string]: any };
      },
      MemoryActionItem<string>[]
    >;
    customPrompt?: string;
  }) {
    const memory = new Memory();
    memory.memoryPath = config.path;

    if (!config.path) {
      throw new Error('Path is required');
    }

    const vectorsFolderPath = joinURL(config.path, 'vectors');
    const dbPath = `sqlite:${config.path}/memory.db`;

    if (!(await pathExists(config.path))) {
      await mkdir(config.path, { recursive: true });
    }

    if (!(await pathExists(vectorsFolderPath))) {
      await mkdir(vectorsFolderPath, { recursive: true });
    }

    memory.llm = config?.llm ?? new OpenAIManager({ apiKey });
    memory.db = config?.db ?? new SQLiteManager(dbPath);
    memory.vectorStoreProvider = config?.vectorStoreProvider ?? new VectorStoreManager(vectorsFolderPath);

    if (config?.customRunnable) {
      memory.customRunnable = config.customRunnable;
    }

    if (config?.customPrompt) {
      memory.customPrompt = config.customPrompt;
    }

    return memory;
  }

  async add(
    messages: { role: string; content: string }[],
    options?: {
      userId?: string;
      sessionId?: string;
      metadata?: { [key: string]: any };
      filters?: { [key: string]: any };
    }
  ): Promise<{ results: MemoryActionItem<T>[] }> {
    const metadata = {
      ...(options?.metadata || {}),
      ...(options?.userId ? { userId: options.userId } : {}),
      ...(options?.sessionId ? { sessionId: options.sessionId } : {}),
    };
    const filters = {
      ...(options?.filters || {}),
      ...(options?.userId ? { userId: options.userId } : {}),
      ...(options?.sessionId ? { sessionId: options.sessionId } : {}),
    };

    const memories = await this._runAddAgent(messages, metadata, filters);
    logger.info('Memory Action Items', { memories });

    const returnedMemories: MemoryActionItem<T>[] = [];
    for (const memory of memories) {
      try {
        switch (memory.event) {
          case 'add': {
            const memoryId = await this._createMemory({ data: memory.memory, metadata });

            returnedMemories.push({
              id: memoryId,
              memory: memory.memory,
              event: memory.event,
            });
            break;
          }

          case 'update': {
            await this._updateMemory({ memoryId: memory.id, data: memory.memory, metadata });

            returnedMemories.push({
              id: memory.id,
              memory: memory.memory,
              event: memory.event,
              oldMemory: memory.oldMemory,
            });
            break;
          }

          case 'delete': {
            await this._deleteMemory(memory.id);

            returnedMemories.push({
              id: memory.id,
              memory: memory.memory,
              event: memory.event,
            });
            break;
          }

          case 'none':
            console.info('NOOP for Memory.');
            break;
        }
      } catch (e) {
        logger.error('Error in newMemoriesWithActions:', e);
      }
    }

    return { results: returnedMemories };
  }

  async search(
    query: string,
    options?: {
      k?: number;
      userId?: string;
      sessionId?: string;
      filters?: { [key: string]: any };
    }
  ): Promise<{ results: SearchMemoryItem<T>[] }> {
    const filters = {
      ...(options?.filters || {}),
      ...(options?.userId ? { userId: options.userId } : {}),
      ...(options?.sessionId ? { sessionId: options.sessionId } : {}),
    };

    return { results: (await this._searchVectorStore(query, options?.k || 100, filters)) || [] };
  }

  async filter(options?: {
    k?: number;
    userId?: string;
    sessionId?: string;
    filters?: { [key: string]: any };
  }): Promise<MemoryItem<T>[]> {
    const filters = {
      ...(options?.filters || {}),
      ...(options?.userId ? { userId: options.userId } : {}),
      ...(options?.sessionId ? { sessionId: options.sessionId } : {}),
    };

    return ((await this.vectorStoreProvider?.list(filters, options?.k || 1)) || []).map((item) => ({
      id: item.id,
      memory: item.pageContent as T,
      metadata: item.metadata || {},
    }));
  }

  async history(memoryId: string) {
    return this.db?.getHistory(memoryId);
  }

  get(memoryId: string): Promise<MemoryItem<T> | null> {
    throw new Error('Not implemented');
  }

  create(
    memory: T,
    options?: {
      userId?: string;
      sessionId?: string;
      metadata?: { [key: string]: any };
    }
  ): Promise<MemoryItem<T>> {
    throw new Error('Not implemented');
  }

  update(memoryId: string, memory: T): Promise<MemoryItem<T> | null> {
    throw new Error('Not implemented');
  }

  delete(memoryId: string): Promise<MemoryItem<T> | null> {
    throw new Error('Not implemented');
  }

  async run(input: O, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O['outputs']>>;
  async run(input: O, options?: RunOptions & { stream?: false }): Promise<O['outputs']>;
  async run(input: O, options?: RunOptions): Promise<RunnableResponse<O['outputs']>> {
    const execute = async () => {
      const { action, inputs } = input;

      switch (action) {
        case 'add':
          return await this.add(inputs.messages, inputs.options);
        case 'search':
          return await this.search(inputs.query, inputs.options);
        case 'filter':
          return { results: await this.filter(inputs.options) };
        case 'get':
          return { results: await this.get(inputs.memoryId) };
        case 'create':
          return { results: await this.create(inputs.memory, inputs.options) };
        case 'update':
          return { results: await this.update(inputs.memoryId, inputs.memory) };
        case 'delete':
          return { results: await this.delete(inputs.memoryId) };
        default:
          throw new Error('Invalid action');
      }
    };

    if (options?.stream) {
      return new ReadableStream({
        async start(controller) {
          try {
            const result = await execute();
            controller.enqueue({ delta: result });
          } catch (error) {
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });
    }

    return execute();
  }

  /**
   * Create a new memory
   *
   * args:
   * - messages: { role: string; content: string }[] Messages to store in the memory.
   * - metadata?: { [key: string]: any }; Metadata to store in the memory. Defaults to undefined.
   * - filters?: { [key: string]: any }; Filters to apply to the search. Defaults to undefined.
   */
  private async _runAddAgent(
    messages: { role: string; content: string }[],
    metadata: { userId?: string; sessionId?: string; [key: string]: any },
    filters?: { [key: string]: any }
  ): Promise<MemoryActionItem<T>[]> {
    const { userId, sessionId, ...rest } = metadata;
    const options = { userId, sessionId, metadata: rest };

    if (this.customRunnable) {
      const result = await this.customRunnable.run({ messages, ...(options || {}) });

      return result;
    }

    return await this._addToVectorStore(messages, filters);
  }

  private async _addToVectorStore(
    messages: { role: string; content: string }[],
    filters?: { [key: string]: any }
  ): Promise<MemoryActionItem<T>[]> {
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

    const response = await generateStructuredResponse(
      llm,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        type: 'json_schema',
        json_schema: {
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
      }
    );

    const newRetrievedFacts = response.facts || [];
    let retrievedOldMemory: { id: string; text: string }[] = [];

    logger.info('newRetrievedFacts', { newRetrievedFacts });

    for (const fact of newRetrievedFacts) {
      const existingMemories = await vectorStoreProvider.search(fact, 5, filters).catch((e) => {
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
    const newMemoriesWithActions = await generateStructuredResponse(
      llm,
      [{ role: 'user', content: funcCallingPrompt }],
      {
        type: 'json_schema',
        json_schema: {
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
      }
    );

    return newMemoriesWithActions.memory.map((m: { id: string; text: string; event: string }) => ({
      id: tempUuidMapping[m.id] ?? nextId(),
      memory: m.text,
      event: (m.event || '').toLowerCase(),
    }));
  }

  private async _createMemory(params: { data: string; metadata: { [key: string]: any } }) {
    const memoryId = nextId();

    const metadata = cloneDeep(params.metadata || {});
    metadata['id'] = memoryId;
    metadata['memoryId'] = memoryId;
    metadata['data'] = params.data;
    metadata['hash'] = createHash('md5').update(params.data).digest('hex');
    metadata['createdAt'] = new Date().toISOString();

    await this.vectorStoreProvider?.insert(params.data, memoryId, metadata);

    await this.db?.addHistory({
      memoryId: memoryId,
      oldMemory: undefined,
      newMemory: params.data,
      event: 'add',
      createdAt: new Date(metadata['createdAt']),
      updatedAt: new Date(),
      isDeleted: false,
    });

    return memoryId;
  }

  private async _updateMemory(params: { memoryId: string; data: string; metadata: { [key: string]: any } }) {
    const content = await this.vectorStoreProvider?.get(params.memoryId);
    if (!content) throw new Error('Memory not found');

    const metadata = cloneDeep({ ...(params.metadata || {}), ...(content.metadata || {}) });
    metadata['data'] = params.data;
    metadata['hash'] = createHash('md5').update(params.data).digest('hex');
    metadata['createdAt'] = content?.createdAt;
    metadata['updatedAt'] = new Date();

    await this.vectorStoreProvider?.update(params.memoryId, params.data, metadata);

    await this.db?.addHistory({
      memoryId: params.memoryId,
      oldMemory: content.pageContent,
      newMemory: params.data,
      event: 'update',
      createdAt: new Date(metadata['createdAt']),
      updatedAt: new Date(metadata['updatedAt']),
      isDeleted: false,
    });
  }

  private async _deleteMemory(memoryId: string) {
    const content = await this.vectorStoreProvider?.get(memoryId);
    if (!content) throw new Error('Memory not found');

    await this.vectorStoreProvider?.delete(memoryId);

    await this.db?.addHistory({
      memoryId: memoryId,
      oldMemory: content.pageContent,
      newMemory: undefined,
      event: 'delete',
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: true,
    });

    return memoryId;
  }

  private async _searchVectorStore(
    query: string,
    k: number,
    filters: { [key: string]: any }
  ): Promise<SearchMemoryItem<T>[]> {
    const memories = await this.vectorStoreProvider?.searchWithScore(query, k, filters);
    if (!memories) return [];

    return memories.map(([memory, score]) => ({
      id: memory.metadata.memoryId as string,
      memory: memory.pageContent as T,
      metadata: memory.metadata,
      score,
    }));
  }
}
