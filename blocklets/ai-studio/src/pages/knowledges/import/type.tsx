import { CreateDiscussionItem } from '@app/libs/dataset';

export type SourceType = 'file' | 'custom' | 'discuss' | 'crawl';

export interface SourceTypeSelectType {
  id: SourceType;
  label: string;
  icon?: React.ReactNode;
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

export type FileType = {
  newFilePath: string;
  runtime: { size: number; hashFileName: string; originFileName: string; relativePath: string; type: string };
};

export type CustomType = {
  title?: string;
  content?: string;
};

export type CrawlType = {
  provider: 'jina' | 'firecrawl';
  apiKey?: string;
  url?: string;
};

export interface CreateKnowledgeParams {
  title?: string;
  sourceType: SourceType;
  file?: FileType;
  custom?: CustomType;
  crawl?: CrawlType;
  discussion?: CreateDiscussionItem[];
}

export type CustomInputProps = {
  title?: string;
  content?: string;
  onTitleChange?: (value: string) => void;
  onContentChange?: (value: string) => void;
};

export interface CrawlSettingsProps {
  provider: string;
  onProviderChange: (provider: 'jina' | 'firecrawl') => void;
  apiKey?: string;
  onApiKeyChange: (value: string) => void;
  url?: string;
  onUrlChange: (value: string) => void;
}
