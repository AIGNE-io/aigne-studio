import { camelCase, startCase } from 'lodash';

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
  key?: string;
  userId?: string;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
  memory: T;
  metadata: MemoryMetadata;
}

export interface MemoryItemWithScore<T> extends MemoryItem<T> {
  score: number;
}

export interface MemoryMessage {
  role: string;
  content: string;
}

export type MemoryActions<T> =
  | {
      action: 'add';
      inputs: {
        messages: MemoryMessage[];
        options?: {
          userId?: string;
          sessionId?: string;
          metadata?: MemoryMetadata;
        };
      };
      outputs: {
        results: MemoryActionItem<T>[];
      };
    }
  | {
      action: 'search';
      inputs: {
        query: string;
        options?: {
          k?: number;
          userId?: string;
          sessionId?: string;
          filter?: MemoryMetadata;
          sort?: MemorySortOptions;
        };
      };
      outputs: {
        results: MemoryItemWithScore<T>[];
      };
    }
  | {
      action: 'filter';
      inputs: {
        options?: {
          k?: number;
          key?: string;
          userId?: string;
          sessionId?: string;
          filter?: MemoryMetadata;
          sort?: MemorySortOptions;
        };
      };
      outputs: {
        results: MemoryItem<T>[];
      };
    }
  | {
      action: 'get';
      inputs: {
        memoryId: string;
      };
      outputs: {
        result: MemoryItem<T> | null;
      };
    }
  | {
      action: 'create';
      inputs: {
        memory: T;
        options?: {
          userId?: string;
          sessionId?: string;
          metadata?: MemoryMetadata;
        };
      };
      outputs: {
        result: MemoryItem<T>;
      };
    }
  | {
      action: 'update';
      inputs: {
        memoryId: string;
        memory: T;
      };
      outputs: {
        result: MemoryItem<T> | null;
      };
    }
  | {
      action: 'delete';
      inputs: {
        memoryId: string;
      };
      outputs: {
        result: MemoryItem<T> | null;
      };
    }
  | {
      action: 'reset';
      inputs: {};
      outputs: {};
    };

export interface SortItem {
  field: string;
  direction: 'asc' | 'desc';
}

export type MemorySortOptions = SortItem | SortItem[];

export abstract class Memory<T, C = undefined> extends Runnable<MemoryActions<T>, MemoryActions<T>['outputs']> {
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
    messages: Extract<MemoryActions<T>, { action: 'add' }>['inputs']['messages'],
    options?: Extract<MemoryActions<T>, { action: 'add' }>['inputs']['options']
  ): Promise<Extract<MemoryActions<T>, { action: 'add' }>['outputs']>;

  abstract search(
    query: Extract<MemoryActions<T>, { action: 'search' }>['inputs']['query'],
    options?: Extract<MemoryActions<T>, { action: 'search' }>['inputs']['options']
  ): Promise<Extract<MemoryActions<T>, { action: 'search' }>['outputs']>;

  abstract filter(
    options: Extract<MemoryActions<T>, { action: 'filter' }>['inputs']['options']
  ): Promise<Extract<MemoryActions<T>, { action: 'filter' }>['outputs']>;

  abstract setByKey(
    key: string,
    memory: Extract<MemoryActions<T>, { action: 'create' }>['inputs']['memory'],
    options?: Extract<MemoryActions<T>, { action: 'create' }>['inputs']['options']
  ): Promise<Extract<MemoryActions<T>, { action: 'create' }>['outputs']>;

  abstract getByKey(
    key: string,
    options?: Extract<MemoryActions<T>, { action: 'filter' }>['inputs']['options']
  ): Promise<Extract<MemoryActions<T>, { action: 'filter' }>['outputs']['results'][number] | null>;

  abstract get(
    memoryId: Extract<MemoryActions<T>, { action: 'get' }>['inputs']['memoryId']
  ): Promise<Extract<MemoryActions<T>, { action: 'get' }>['outputs']>;

  abstract create(
    memory: Extract<MemoryActions<T>, { action: 'create' }>['inputs']['memory'],
    options?: Extract<MemoryActions<T>, { action: 'create' }>['inputs']['options']
  ): Promise<Extract<MemoryActions<T>, { action: 'create' }>['outputs']>;

  abstract update(
    memoryId: Extract<MemoryActions<T>, { action: 'update' }>['inputs']['memoryId'],
    memory: T
  ): Promise<Extract<MemoryActions<T>, { action: 'update' }>['outputs']>;

  abstract delete(
    memoryId: Extract<MemoryActions<T>, { action: 'delete' }>['inputs']['memoryId']
  ): Promise<Extract<MemoryActions<T>, { action: 'delete' }>['outputs']>;

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
