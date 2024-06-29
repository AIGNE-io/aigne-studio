export * from './project';

export type ResourceType =
  | 'application'
  | 'tool'
  | 'llm-adapter'
  | 'aigc-adapter'
  | 'knowledge'
  | 'template'
  | 'example';

export const ResourceTypes: ResourceType[] = [
  'application',
  'tool',
  'llm-adapter',
  'aigc-adapter',
  'knowledge',
  'template',
  'example',
];
