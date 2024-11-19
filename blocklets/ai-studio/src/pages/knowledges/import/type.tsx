import { IconifyIcon } from '@iconify-icon/react';

export type SourceType = 'file' | 'custom' | 'discuss' | 'crawl';

export interface SourceTypeSelectType {
  id: SourceType;
  label: string;
  icon?: IconifyIcon;
  disabled?: boolean;
}

interface BaseKnowledge {}

interface FileKnowledge extends BaseKnowledge {
  sourceType: 'file';
  files: {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }[];
}

interface CustomKnowledge extends BaseKnowledge {
  sourceType: 'custom';
  content: string;
}

interface DiscussKnowledge extends BaseKnowledge {
  sourceType: 'discuss';
  discussId: string;
  messages: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }[];
}

interface CrawlKnowledge extends BaseKnowledge {
  sourceType: 'crawl';
  provider: 'jina' | 'firecrawl';
  apiKey: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  lastCrawledAt?: string;
}

export type Knowledge = FileKnowledge | CustomKnowledge | DiscussKnowledge | CrawlKnowledge;

export interface CreateKnowledgeParams {
  title?: string;
  sourceType: SourceType;
  files?: File[];
  content?: string;
  provider?: 'jina' | 'firecrawl';
  apiKey?: string;
  url?: string;
}
