import {
  Memory,
  MemoryActionItem,
  MemoryActions,
  MemoryRunner,
  MemoryRunnerInputs,
  RunOptions,
  RunnableResponse,
  RunnableResponseStream,
} from '@aigne/core';
import { mkdir, writeFile } from 'fs-extra';
import { joinURL } from 'ufo';
import { stringify } from 'yaml';

import nextId from '../lib/next-id';
import { objectToStream } from '../lib/utils';
import logger from '../logger';
import DefaultHistoryStore from '../storage/sqlite';
import SearchKitRetriever from '../vector-stores/search-kit';
import { loadConfig } from './config';
import { HistoryStore, Retrievable, VectorStoreDocument } from './type';

export class DefaultMemory<T, I extends MemoryActions<T>> extends Memory<T> {
  static async load<T extends string>(options: {
    path: string;
    runner: MemoryRunner<T>;
    retriever?: Retrievable<T>;
    historyStore?: HistoryStore<T>;
  }) {
    const configPath = joinURL(options.path, 'config.yaml');

    const config = (await loadConfig(configPath)) ?? { id: nextId() };

    await mkdir(options.path, { recursive: true });
    await writeFile(configPath, stringify(config));

    const historyStore = options.historyStore ?? DefaultHistoryStore.load<T>({ path: options.path });
    const vectorStore = options.retriever ?? SearchKitRetriever.load<T>({ id: config.id, path: options.path });

    return new DefaultMemory({
      path: options.path,
      runner: options.runner,
      vectorStore,
      historyStore,
    });
  }

  constructor(options: {
    path: string;
    runner: MemoryRunner<T>;
    vectorStore: Retrievable<T>;
    historyStore: HistoryStore<T>;
  }) {
    super();

    this.path = options.path;
    this.runner = options.runner;
    this.vectorStore = options.vectorStore;
    this.historyStore = options.historyStore;
  }

  path: string;

  runner: MemoryRunner<T>;

  vectorStore: Retrievable<T>;

  historyStore: HistoryStore<T>;

  async add(
    messages: Extract<MemoryActions<T>, { action: 'add' }>['inputs']['messages'],
    options?: Extract<MemoryActions<T>, { action: 'add' }>['inputs']['options']
  ): Promise<Extract<MemoryActions<T>, { action: 'add' }>['outputs']> {
    const { userId, sessionId, metadata = {} } = options ?? {};

    const [actions] = await Promise.all([
      this.runRunner({ ...options, messages }),
      this.historyStore.addMessage({ userId, sessionId, messages, metadata }),
    ]);

    logger.debug('Extract memory actions', { actions });

    const results: MemoryActionItem<T>[] = [];

    for (const action of actions) {
      switch (action.event) {
        case 'add': {
          const memory = await this.createMemory({
            userId,
            sessionId,
            memory: action.memory,
            metadata: { ...metadata, ...action.metadata },
          });

          results.push({ id: memory.id, memory: action.memory, event: action.event });
          break;
        }

        case 'update': {
          await this.updateMemory({
            id: action.id,
            userId,
            sessionId,
            memory: action.memory,
            metadata: { ...metadata, ...action.metadata },
          });

          results.push({ id: action.id, memory: action.memory, event: action.event, oldMemory: action.oldMemory });
          break;
        }

        case 'delete': {
          await this.deleteMemory(action.id);

          results.push({ id: action.id, memory: action.memory, event: action.event });
          break;
        }

        case 'none':
          logger.debug('NOOP for Memory.');
          break;

        default:
          logger.warn('Unknown action', { action: (action as any).event });
          break;
      }
    }

    return { results };
  }

  async search(
    query: Extract<MemoryActions<T>, { action: 'search' }>['inputs']['query'],
    options?: Extract<MemoryActions<T>, { action: 'search' }>['inputs']['options']
  ): Promise<Extract<MemoryActions<T>, { action: 'search' }>['outputs']> {
    const filter = {
      ...options?.filter,
      ...(options?.userId ? { userId: options.userId } : {}),
      ...(options?.sessionId ? { sessionId: options.sessionId } : {}),
    };

    const memories = await this.vectorStore.searchWithScore(query, options?.k || 100, {
      filter,
      sort: options?.sort,
    });

    return { results: memories.map(([memory, score]) => ({ ...memory, score })) };
  }

  async filter(
    options: Extract<MemoryActions<T>, { action: 'filter' }>['inputs']['options']
  ): Promise<Extract<MemoryActions<T>, { action: 'filter' }>['outputs']> {
    const filter = {
      ...options?.filter,
      ...(options?.userId ? { userId: options.userId } : {}),
      ...(options?.sessionId ? { sessionId: options.sessionId } : {}),
    };

    const results = await this.vectorStore.list(options?.k || 1, { filter, sort: options?.sort });

    return { results };
  }

  async get(
    memoryId: Extract<MemoryActions<T>, { action: 'get' }>['inputs']['memoryId']
  ): Promise<Extract<MemoryActions<T>, { action: 'get' }>['outputs']> {
    const result = await this.vectorStore.get(memoryId);

    return { result };
  }

  async create(
    memory: Extract<MemoryActions<T>, { action: 'create' }>['inputs']['memory'],
    options?: Extract<MemoryActions<T>, { action: 'create' }>['inputs']['options']
  ): Promise<Extract<MemoryActions<T>, { action: 'create' }>['outputs']> {
    const result = await this.createMemory({ ...options, memory, metadata: options?.metadata ?? {} });
    return { result };
  }

  async update(
    memoryId: Extract<MemoryActions<T>, { action: 'update' }>['inputs']['memoryId'],
    memory: T
  ): Promise<Extract<MemoryActions<T>, { action: 'update' }>['outputs']> {
    const result = await this.updateMemory({ id: memoryId, memory });
    return { result };
  }

  async delete(
    memoryId: Extract<MemoryActions<T>, { action: 'delete' }>['inputs']['memoryId']
  ): Promise<Extract<MemoryActions<T>, { action: 'delete' }>['outputs']> {
    const result = await this.deleteMemory(memoryId);
    return { result };
  }

  private async _run(input: I): Promise<I['outputs']> {
    const { action, inputs } = input;

    switch (action) {
      case 'add':
        return await this.add(inputs.messages, inputs.options);
      case 'search':
        return await this.search(inputs.query, inputs.options);
      case 'filter':
        return await this.filter(inputs.options);
      case 'get':
        return await this.get(inputs.memoryId);
      case 'create':
        return await this.create(inputs.memory, inputs.options);
      case 'update':
        return await this.update(inputs.memoryId, inputs.memory);
      case 'delete':
        return await this.delete(inputs.memoryId);
      default:
        throw new Error('Invalid action');
    }
  }

  async run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<I['outputs']>>;
  async run(input: I, options?: RunOptions & { stream?: false }): Promise<I['outputs']>;
  async run(input: I, options?: RunOptions): Promise<RunnableResponse<I['outputs']>> {
    const result = await this._run(input);

    return options?.stream ? objectToStream({ delta: result }) : result;
  }

  private async runRunner(inputs: MemoryRunnerInputs): Promise<MemoryActionItem<T>[]> {
    // TODO: runner 中需要用到 vectorStore，暂时通过这种方式传递
    (this.runner as any).vectorStore = this.vectorStore;

    return await this.runner.run(inputs);
  }

  private async createMemory(params: Omit<VectorStoreDocument<T>, 'id' | 'createdAt' | 'updatedAt'>) {
    const memoryId = nextId();
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;
    const { userId, sessionId, memory, metadata } = params;

    const document: VectorStoreDocument<T> = {
      id: memoryId,
      userId,
      sessionId,
      createdAt,
      updatedAt,
      memory,
      metadata,
    };

    await Promise.all([
      this.vectorStore.insert(document),
      this.historyStore.addHistory({ memoryId, newMemory: params.memory, event: 'add' }),
    ]);

    return document;
  }

  private async updateMemory(params: Partial<VectorStoreDocument<T>> & { id: string }) {
    const originalMemory = await this.vectorStore.get(params.id);
    if (!originalMemory) throw new Error('Memory not found');

    const newMemory = {
      ...originalMemory,
      ...params,
      updatedAt: new Date().toISOString(),
      metadata: { ...originalMemory.metadata, ...params.metadata },
    };

    await Promise.all([
      this.vectorStore.update(newMemory),

      this.historyStore.addHistory({
        memoryId: params.id,
        oldMemory: originalMemory.memory,
        newMemory: params.memory,
        event: 'update',
      }),
    ]);

    return newMemory;
  }

  private async deleteMemory(memoryId: string) {
    const memory = await this.vectorStore.get(memoryId);
    if (!memory) throw new Error('Memory not found');

    await Promise.all([
      this.vectorStore.delete(memoryId),
      this.historyStore?.addHistory({
        memoryId: memoryId,
        oldMemory: memory.memory,
        event: 'delete',
        isDeleted: true,
      }),
    ]);

    return memory;
  }
}
