import { IDatasource } from './datasource';

export enum UploadStatus {
  Idle = 'idle',
  Uploading = 'uploading',
  Success = 'success',
  Error = 'error',
}

export interface SearchParams {
  query: string;
  k: number;
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

export type KnowledgeDocument = {
  id: string;
  type: 'file' | 'text' | 'discussKit' | 'url';
  data?:
    | {
        type: 'file';
      }
    | {
        type: 'text';
      }
    | {
        type: 'discussKit';
        data: {
          id: string;
          title: string;
          type?: 'discussion' | 'blog' | 'doc';
          from: 'discussion' | 'board' | 'discussionType';
          boardId?: string;
        };
      }
    | {
        type: 'url';
        provider: 'jina' | 'firecrawl';
        url?: string;
      };
  name?: string;
  content?: any;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  error?: string | null;
  embeddingStartAt?: Date;
  embeddingEndAt?: Date;
  embeddingStatus?: UploadStatus | string;
  filename?: string;
  size?: number;
};

export interface KnowledgeSegment {
  id: string;
  documentId: string;
  content?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IKnowledgeBase<I extends SearchParams, O extends Document[]> extends IDatasource<I, O> {
  // 知识库信息
  getInfo(): Promise<KnowledgeBaseInfo>;
  update(info: Partial<KnowledgeBaseInfo>): Promise<KnowledgeBaseInfo>;
  delete(): Promise<void>;

  // 文档管理
  addDocuments(params: DocumentParams): Promise<O>;
  getDocuments(
    params: { [key: string]: any },
    page: number,
    size: number
  ): Promise<{ total: number; items: KnowledgeDocument[] }>;
  getDocument(documentId: string): Promise<KnowledgeDocument>;
  removeDocument(documentId: string): Promise<number>;
  removeDocuments(documentIds: string[]): Promise<number[]>;

  // 文档分段管理
  getSegments(documentId: string): Promise<KnowledgeSegment[]>;
  removeSegments(documentId: string): Promise<number>;

  search(params: I): Promise<O>;
}

interface BaseDocumentParams {}

export interface FileDocumentParams extends BaseDocumentParams {
  type: 'file';
  file: File;
}

export interface DiscussKitDocumentParams extends BaseDocumentParams {
  type: 'discussKit';
  source: CreateDiscussionItem;
}

export interface URLDocumentParams extends BaseDocumentParams {
  type: 'url';
  url: string;
  crawlType: 'jina' | 'firecrawl';
  apiKey: string;
}

export interface CustomDocumentParams extends BaseDocumentParams {
  type: 'text';
  title: string;
  content: string;
}

export type DocumentParams = FileDocumentParams | DiscussKitDocumentParams | URLDocumentParams | CustomDocumentParams;

export interface CreateDiscussionItem {
  name: string;
  data: {
    id: string;
    title: string;
    type?: 'discussion' | 'blog' | 'doc';
    from: 'discussion' | 'board' | 'discussionType';
    boardId?: string;
  };
}
