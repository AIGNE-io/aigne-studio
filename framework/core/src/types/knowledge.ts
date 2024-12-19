import { IDatasource } from './datasource';

export interface SearchParams {
  query: string;
  k?: number;
}

export interface Document {
  id: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface KnowledgeBaseInfo {
  id: string;
  name?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  documents?: number;
  projectId?: string;
  resourceBlockletDid?: string;
  knowledgeId?: string;
  icon?: string;
}

export interface IKnowledgeBase<I extends { [key: string]: any }, O> extends IDatasource<I, O> {
  // delete(): Promise<void>;
  update(info: Partial<KnowledgeBaseInfo>): Promise<KnowledgeBaseInfo>;

  addDocuments(documents: Document[]): Promise<Document[]>;
  removeDocuments(documentIds: string[]): Promise<void>;

  search(params: SearchParams): Promise<O>;
}

interface DocumentLoader {
  load(): Promise<Document[]>;
}

export interface FileLoader extends DocumentLoader {
  file: File;
}

export interface DiscussKitLoader extends DocumentLoader {
  source: { type: 'discussion'; discussionId: string } | { type: 'board'; boardId: string } | { type: 'all' };
}

export interface URLLoader extends DocumentLoader {
  url: string;
}
