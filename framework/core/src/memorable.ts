import { camelCase, startCase } from 'lodash';

import type { LLMModelInputMessage } from './llm-model';
import { Runnable } from './runnable';
import { OrderedRecord } from './utils';

export interface MemoryMetadata {
  [key: string]: any;
}

export type MemoryActionItem<T> =
  | { event: 'add'; id: string; memory: T; metadata?: MemoryMetadata }
  | { event: 'update'; id: string; memory: T; oldMemory: T; metadata?: MemoryMetadata }
  | { event: 'delete'; id: string; memory: T }
  | { event: 'none'; memory: T };

export interface MemoryItem<T> {
  id: string;
  userId?: string;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
  memory: T;
  metadata: MemoryMetadata;
}

export interface MemoryItemWithScore<T = any> extends MemoryItem<T> {
  score: number;
}

export type MemoryMessage = LLMModelInputMessage;

export type MemoryActions<T> =
  | {
      action: 'add';
      input: {
        messages: MemoryMessage[];
        options?: {
          userId?: string;
          sessionId?: string;
          metadata?: MemoryMetadata;
        };
      };
      output: {
        results: MemoryActionItem<T>[];
      };
    }
  | {
      action: 'search';
      input: {
        query: string;
        options?: {
          k?: number;
          userId?: string;
          sessionId?: string;
          filter?: MemoryMetadata;
          sort?: MemorySortOptions;
        };
      };
      output: {
        results: MemoryItemWithScore<T>[];
      };
    }
  | {
      action: 'filter';
      input: {
        options?: {
          k?: number;
          userId?: string;
          sessionId?: string;
          filter?: MemoryMetadata;
          sort?: MemorySortOptions;
        };
      };
      output: {
        results: MemoryItem<T>[];
      };
    }
  | {
      action: 'get';
      input: {
        memoryId: string;
      };
      output: {
        result: MemoryItem<T> | null;
      };
    }
  | {
      action: 'create';
      input: {
        memory: T;
        options?: {
          userId?: string;
          sessionId?: string;
          metadata?: MemoryMetadata;
        };
      };
      output: {
        result: MemoryItem<T>;
      };
    }
  | {
      action: 'update';
      input: {
        memoryId: string;
        memory: T;
      };
      output: {
        result: MemoryItem<T> | null;
      };
    }
  | {
      action: 'delete';
      input: {
        filter: string | string[] | Record<string, any>;
      };
      output: {};
    }
  | {
      action: 'reset';
      input: {};
      output: {};
    };

export interface SortItem {
  field: string;
  direction: 'asc' | 'desc';
}

export type MemorySortOptions = SortItem | SortItem[];

export abstract class Memorable<T, C = undefined> extends Runnable<MemoryActions<T>, MemoryActions<T>['output']> {
  constructor() {
    super({
      id: 'memory',
      type: 'memory',
      name: 'Memory',
      inputs: OrderedRecord.fromArray([]),
      outputs: OrderedRecord.fromArray([]),
    });
  }

  abstract runner?: MemoryRunner<T, C>;

  abstract add(
    messages: Extract<MemoryActions<T>, { action: 'add' }>['input']['messages'],
    options?: Extract<MemoryActions<T>, { action: 'add' }>['input']['options']
  ): Promise<Extract<MemoryActions<T>, { action: 'add' }>['output']>;

  abstract search(
    query: Extract<MemoryActions<T>, { action: 'search' }>['input']['query'],
    options?: Extract<MemoryActions<T>, { action: 'search' }>['input']['options']
  ): Promise<Extract<MemoryActions<T>, { action: 'search' }>['output']>;

  abstract filter(
    options: Extract<MemoryActions<T>, { action: 'filter' }>['input']['options']
  ): Promise<Extract<MemoryActions<T>, { action: 'filter' }>['output']>;

  abstract get(
    memoryId: Extract<MemoryActions<T>, { action: 'get' }>['input']['memoryId']
  ): Promise<Extract<MemoryActions<T>, { action: 'get' }>['output']>;

  abstract create(
    memory: Extract<MemoryActions<T>, { action: 'create' }>['input']['memory'],
    options?: Extract<MemoryActions<T>, { action: 'create' }>['input']['options']
  ): Promise<Extract<MemoryActions<T>, { action: 'create' }>['output']>;

  abstract update(
    memoryId: Extract<MemoryActions<T>, { action: 'update' }>['input']['memoryId'],
    memory: T
  ): Promise<Extract<MemoryActions<T>, { action: 'update' }>['output']>;

  abstract delete(
    memoryId: Extract<MemoryActions<T>, { action: 'delete' }>['input']['filter']
  ): Promise<Extract<MemoryActions<T>, { action: 'delete' }>['output']>;

  abstract reset(): Promise<void>;
}

export interface MemoryRunnerInput<C = undefined> {
  messages: MemoryMessage[];
  userId?: string;
  sessionId?: string;
  metadata?: MemoryMetadata;
  filter?: MemoryMetadata;
  customData: C;
}

export abstract class MemoryRunner<T, C = undefined> extends Runnable<MemoryRunnerInput<C>, MemoryActionItem<T>[]> {
  constructor(name: string) {
    const id = `${camelCase(name)}_runner`;

    super({
      id,
      type: id,
      name: `${startCase(name)} Runner`,
      description: `${startCase(name)} Runner`,
      inputs: OrderedRecord.fromArray([]),
      outputs: OrderedRecord.fromArray([]),
    });
  }
}

export type MemorableSearchOutput<T extends Memorable<any>> = Awaited<ReturnType<T['search']>>['results'];
