import { Document } from 'langchain/document';

import { Runnable } from './runnable';
import { OrderedRecord } from './utils';

export type MemoryActionItem<T> =
  | {
      id: string;
      event: 'add';
      memory: T;
    }
  | {
      event: 'update';
      id: string;
      memory: T;
      oldMemory: T;
    }
  | {
      event: 'delete';
      id: string;
      memory: T;
    }
  | {
      event: 'none';
      memory: T;
    };

export interface MemoryItem<T> {
  id: string;
  memory: T;
  metadata: { [key: string]: any };
}

export interface SearchMemoryItem<T> extends MemoryItem<T> {
  score: number;
}

export type MemoryActions<T> =
  | {
      action: 'add';
      inputs: {
        messages: { role: string; content: string }[];
        options?: {
          userId?: string;
          sessionId?: string;
          metadata?: { [key: string]: any };
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
          filters?: { [key: string]: any };
        };
      };
      outputs: {
        results: SearchMemoryItem<T>[];
      };
    }
  | {
      action: 'filter';
      inputs: {
        options?: {
          k?: number;
          userId?: string;
          sessionId?: string;
          filters?: { [key: string]: any };
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
        results: MemoryItem<T> | null;
      };
    }
  | {
      action: 'create';
      inputs: {
        memory: T;
        options?: {
          userId?: string;
          sessionId?: string;
          metadata?: { [key: string]: any };
        };
      };
      outputs: {
        results: MemoryItem<T>;
      };
    }
  | {
      action: 'update';
      inputs: {
        memoryId: string;
        memory: T;
      };
      outputs: {
        results: MemoryItem<T> | null;
      };
    }
  | {
      action: 'delete';
      inputs: {
        memoryId: string;
      };
      outputs: {
        results: MemoryItem<T> | null;
      };
    };

export abstract class CMemoryRunner<T> extends Runnable<MemoryActions<T>, MemoryActions<T>['outputs']> {
  constructor() {
    super({
      id: 'memory_runner',
      type: 'memory_runner',
      name: 'Memory Runner',
      description: 'Run a memory',
      inputs: OrderedRecord.fromArray([]),
      outputs: OrderedRecord.fromArray([]),
    });
  }

  abstract runnable?: Runnable<
    {
      messages: { role: string; content: string }[];
      userId?: string;
      sessionId?: string;
      metadata?: { [key: string]: any };
    },
    MemoryActionItem<T>[]
  >;

  abstract add(
    messages: { role: string; content: string }[],
    options?: {
      userId?: string;
      sessionId?: string;
      metadata?: { [key: string]: any };
      filters?: { [key: string]: any };
    }
  ): Promise<{ results: MemoryActionItem<T>[] }>;

  abstract search(
    query: string,
    options?: {
      k?: number;
      userId?: string;
      sessionId?: string;
      filters?: { [key: string]: any };
    }
  ): Promise<{ results: SearchMemoryItem<T>[] }>;

  abstract filter(options: {
    k?: number;
    userId?: string;
    sessionId?: string;
    filters?: { [key: string]: any };
  }): Promise<MemoryItem<T>[]>;

  abstract get(memoryId: string): Promise<MemoryItem<T> | null>;

  abstract create(
    memory: T,
    options?: {
      userId?: string;
      sessionId?: string;
      metadata?: { [key: string]: any };
    }
  ): Promise<MemoryItem<T>>;

  abstract update(memoryId: string, memory: T): Promise<MemoryItem<T> | null>;

  abstract delete(memoryId: string): Promise<MemoryItem<T> | null>;
}

export type EventType = 'add' | 'update' | 'delete' | 'none';

export type VectorStoreContent = {
  id: string;
  pageContent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
};

export interface IVectorStoreManager {
  get(id: string): Promise<VectorStoreContent | null>;
  insert(data: string, id: string, metadata: Record<string, any>): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAll(ids: string[]): Promise<void>;
  update(id: string, data: string, metadata: Record<string, any>): Promise<void>;
  list(metadata: Record<string, any>, limit?: number): Promise<VectorStoreContent[]>;
  search(query: string, k: number, metadata?: Record<string, any>): Promise<Document[]>;
  searchWithScore(query: string, k: number, metadata?: Record<string, any>): Promise<[Document, number][]>;
}

export interface IStorageManager {
  addHistory(params: {
    memoryId: string;
    oldMemory?: string;
    newMemory?: string;
    event: EventType;
    createdAt?: Date;
    updatedAt?: Date;
    isDeleted?: boolean;
  }): Promise<any>;
  getHistory(memoryId: string): Promise<any>;
  addMessage(message: { [key: string]: any }, metadata: { [key: string]: any }): Promise<any>;
  getMessage(id: string): Promise<any>;
  getMessages(props: { [key: string]: any }): Promise<any>;
  reset(): Promise<void>;
}
