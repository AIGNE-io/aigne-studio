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
import { mkdir, pathExists } from 'fs-extra';
import { cloneDeep, omit } from 'lodash';
import { joinURL } from 'ufo';

import nextId from '../lib/next-id';
import OpenAIManager from '../llm/openai';
import logger from '../logger';
import SQLiteManager from '../storage/sqlite';
import VectorStoreManager from '../vector-stores/search-kit';
import { CustomAgent } from './customAgent';

type RunnableInput = {
  messages: { role: string; content: string }[];
  userId?: string;
  sessionId?: string;
  metadata?: { [key: string]: any };
};

function validateConfigDecorator(_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = async function (this: { validateConfig?: () => void }, ...args: any[]) {
    if (typeof this.validateConfig === 'function') {
      this.validateConfig();
    }

    return await originalMethod.apply(this, args);
  };
  return descriptor;
}

export class Memory<T extends string, O extends MemoryActions<T>> implements IMemory<T> {
  memoryPath: string = '';

  llm?: OpenAIManager;
  db?: IStorageManager;
  vectorStoreProvider?: IVectorStoreManager;
  runnable?: Runnable<RunnableInput, MemoryActionItem<T>[]>;
  customPrompt?: string;

  static async load(config: {
    path: string;
    vectorStoreProvider?: IVectorStoreManager;
    llmProvider?: OpenAIManager;
    dbProvider?: IStorageManager;
    runnable?: Runnable<RunnableInput, MemoryActionItem<string>[]>;
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

    memory.llm = config?.llmProvider ?? new OpenAIManager({ apiKey: '' });
    memory.db = config?.dbProvider ?? (await SQLiteManager.load(dbPath));
    memory.vectorStoreProvider = config?.vectorStoreProvider ?? (await VectorStoreManager.load(vectorsFolderPath));

    if (config?.runnable) {
      memory.runnable = config.runnable;
    }

    if (config?.customPrompt) {
      memory.customPrompt = config.customPrompt;
    }

    return memory;
  }

  validateConfig() {
    if (!this.llm) {
      throw new Error('Please provide a LLM Provider, You can use Memory.load({llm: ...}) to load a LLM Provider');
    }

    if (!this.db) {
      throw new Error('Please provide a DB Provider, You can use Memory.load({db: ...}) to load a DB Provider');
    }

    if (!this.vectorStoreProvider) {
      throw new Error(
        'Please provide a Vector Store Provider, You can use Memory.load({vectorStoreProvider: ...}) to load a Vector Store Provider'
      );
    }
  }

  @validateConfigDecorator
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
    logger.info('Extract memories of type MemoryActionItem', { memories });

    await Promise.all(messages.map((message) => this.db?.addMessage(message, metadata)));

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
            logger.warn('NOOP for Memory.');
            break;
        }
      } catch (e) {
        logger.error('Error in newMemoriesWithActions:', e);
      }
    }

    return { results: returnedMemories };
  }

  @validateConfigDecorator
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

  @validateConfigDecorator
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

  @validateConfigDecorator
  async history(memoryId: string) {
    return this.db?.getHistory(memoryId);
  }

  private extractMessage(message: { [key: string]: any }) {
    const excludedKeys = ['id', 'memoryId', 'data', 'hash', 'createdAt', 'updatedAt'];
    return omit(message, excludedKeys);
  }

  @validateConfigDecorator
  async get(memoryId: string): Promise<MemoryItem<T> | null> {
    const message = await this.vectorStoreProvider?.get(memoryId);

    if (!message) return null;

    return {
      id: message.id,
      memory: message.pageContent as T,
      metadata: this.extractMessage(message.metadata || {}),
    };
  }

  @validateConfigDecorator
  async create(
    memory: T,
    options?: {
      userId?: string;
      sessionId?: string;
      metadata?: { [key: string]: any };
    }
  ): Promise<MemoryItem<T>> {
    const metadata = {
      ...(options?.metadata || {}),
      ...(options?.userId ? { userId: options.userId } : {}),
      ...(options?.sessionId ? { sessionId: options.sessionId } : {}),
    };

    const memoryId = await this._createMemory({ data: memory, metadata: {} });

    // await this.db?.addMessage({ message });

    return {
      id: memoryId,
      memory,
      metadata,
    };
  }

  @validateConfigDecorator
  async update(memoryId: string, memory: T): Promise<MemoryItem<T> | null> {
    try {
      const result = await this._updateMemory({ memoryId, data: memory, metadata: {} });
      return result;
    } catch (error) {
      return null;
    }
  }

  @validateConfigDecorator
  async delete(memoryId: string): Promise<MemoryItem<T> | null> {
    const memory = await this.get(memoryId);

    if (!memory) return null;

    await this._deleteMemory(memoryId);

    return memory;
  }

  @validateConfigDecorator
  async deleteAll(options?: { userId?: string; sessionId?: string; filters?: { [key: string]: any } }) {
    const filters = {
      ...(options?.filters || {}),
      ...(options?.userId ? { userId: options.userId } : {}),
      ...(options?.sessionId ? { sessionId: options.sessionId } : {}),
    };

    const ids = ((await this.vectorStoreProvider?.list(filters)) || []).map((item) => item.id);
    await this.vectorStoreProvider?.deleteAll(ids);
  }

  async run(input: O, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O['outputs']>>;
  async run(input: O, options?: RunOptions & { stream?: false }): Promise<O['outputs']>;
  @validateConfigDecorator
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

    if (this.runnable) {
      return await this.runnable.run({ messages, ...(options || {}) }, { stream: false });
    }

    const customRunnableExtractor = new CustomAgent<
      {
        messages: { role: string; content: string }[];
        userId?: string;
        sessionId?: string;
        metadata?: { [key: string]: any };
      },
      MemoryActionItem<T>[]
    >(this.vectorStoreProvider!, this.llm!, this.customPrompt);
    return await customRunnableExtractor.run(
      { messages, ...(options || {}), ...{ metadata: filters } },
      { stream: false }
    );
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

  private async _updateMemory(params: { memoryId: string; data: T; metadata: { [key: string]: any } }) {
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

    return {
      id: params.memoryId,
      memory: params.data,
      metadata,
    };
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
