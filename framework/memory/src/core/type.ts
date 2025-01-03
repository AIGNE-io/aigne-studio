import { MemoryActionItem, MemoryItem, MemoryMessage, MemoryMetadata, MemorySortOptions } from '@aigne/core';

export type VectorStoreDocument<T> = MemoryItem<T>;

export interface VectorStoreSearchOptions {
  filter?: Record<string, any>;
  sort?: MemorySortOptions;
}

export interface Retrievable<T> {
  get(id: string): Promise<VectorStoreDocument<T> | null>;
  insert(document: VectorStoreDocument<T>): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAll(ids: string[]): Promise<void>;
  update(document: VectorStoreDocument<T>): Promise<void>;
  list(k: number, options?: VectorStoreSearchOptions): Promise<VectorStoreDocument<T>[]>;
  search(query: string, k: number, options?: VectorStoreSearchOptions): Promise<VectorStoreDocument<T>[]>;
  searchWithScore(
    query: string,
    k: number,
    options?: VectorStoreSearchOptions
  ): Promise<[VectorStoreDocument<T>, number][]>;
}

export type EventType = MemoryActionItem<any>['event'];

export interface ActionHistory<T> {
  createdAt: Date;
  updatedAt: Date;
  memoryId: string;
  oldMemory?: T;
  newMemory?: T;
  event: EventType;
  isDeleted?: boolean;
}

export interface MessageHistory {
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  sessionId?: string;
  messages: MemoryMessage[];
  metadata: MemoryMetadata;
}

export interface HistoryStore<T> {
  addHistory(history: Omit<ActionHistory<T>, 'createdAt' | 'updatedAt'>): Promise<ActionHistory<T>>;
  getHistory(memoryId: string): Promise<ActionHistory<T>[]>;
  addMessage(history: Omit<MessageHistory, 'createdAt' | 'updatedAt'>): Promise<MessageHistory>;
  getMessages(options: { filter: { [key: string]: any } }): Promise<MessageHistory[]>;
}
