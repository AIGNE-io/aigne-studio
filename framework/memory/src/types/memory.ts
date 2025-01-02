import { MemoryActionItem } from '@aigne/core';
import { Document } from 'langchain/document';

export type EventType = MemoryActionItem<any>['event'];

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
  addMessage(message: { [key: string]: any }[], metadata: { [key: string]: any }): Promise<any>;
  getMessage(id: string): Promise<any>;
  getMessages(props: { [key: string]: any }): Promise<any>;
  reset(): Promise<void>;
}
