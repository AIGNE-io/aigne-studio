import { Runnable } from './runnable';

export type MemoryActionItem<T> =
  | {
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

export interface IMemory<T> extends Runnable<MemoryActions<T>, MemoryActions<T>['outputs']> {
  customRunnable?: Runnable<
    {
      messages: { role: string; content: string }[];
      userId?: string;
      sessionId?: string;
      metadata?: { [key: string]: any };
    },
    MemoryItem<T>[]
  >;

  add(
    messages: { role: string; content: string }[],
    options?: {
      userId?: string;
      sessionId?: string;
      metadata?: { [key: string]: any };
    }
  ): Promise<{ results: MemoryActionItem<T>[] }>;

  search(
    query: string,
    options?: {
      k?: number;
      userId?: string;
      sessionId?: string;
      filters?: { [key: string]: any };
    }
  ): Promise<{ results: SearchMemoryItem<T>[] }>;

  filter(options: {
    k?: number;
    userId?: string;
    sessionId?: string;
    filters?: { [key: string]: any };
  }): Promise<MemoryItem<T>[]>;

  get(memoryId: string): Promise<MemoryItem<T> | null>;

  create(
    memory: T,
    options?: {
      userId?: string;
      sessionId?: string;
      metadata?: { [key: string]: any };
    }
  ): Promise<MemoryItem<T>>;

  update(memoryId: string, memory: T): Promise<MemoryItem<T> | null>;

  delete(memoryId: string): Promise<MemoryItem<T> | null>;
}
