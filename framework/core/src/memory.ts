import { camelCase, startCase } from 'lodash';

import { Runnable } from './runnable';
import { OrderedRecord } from './utils';

export type MemoryActionItem<T> =
  | {
      id: string;
      event: 'add';
      memory: T;
      metadata?: { [key: string]: any };
    }
  | {
      event: 'update';
      id: string;
      memory: T;
      oldMemory: T;
      metadata?: { [key: string]: any };
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
          filters?: { [key: string]: any };
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

export abstract class CMemoryRunner<T extends string> extends Runnable<MemoryActions<T>, MemoryActions<T>['outputs']> {
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

  abstract runnable?: MemoryRunnable<T>;

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

export interface MemoryRunnableInputs {
  messages: { role: string; content: string }[];

  userId?: string;
  sessionId?: string;
  metadata?: { [key: string]: any };
  filters?: { [key: string]: any };
}

export abstract class MemoryRunnable<
  T extends string = string,
  O extends MemoryActionItem<T>[] = MemoryActionItem<T>[],
> extends Runnable<MemoryRunnableInputs, O> {
  constructor(name: string) {
    const id = `${camelCase(name)}_runnable`;

    super({
      id,
      type: id,
      name: `${startCase(name)} Runnable`,
      description: `${startCase(name)} Runnable`,
      inputs: OrderedRecord.fromArray([]),
      outputs: OrderedRecord.fromArray([]),
    });
  }
}
