import type { CreateDiscussionItem } from '@app/libs/knowledge';

export type SourceType = 'file' | 'custom' | 'discuss' | 'url';

export interface SourceTypeSelectType {
  id: SourceType;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export type FileType = {
  newFilePath: string;
  runtime: { size: number; hashFileName: string; originFileName: string };
};

export type CustomType = {
  title?: string;
  content?: string;
};

export type CrawlType = {
  provider: 'jina' | 'firecrawl';
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
  url?: string;
  onUrlChange: (value: string) => void;
}
