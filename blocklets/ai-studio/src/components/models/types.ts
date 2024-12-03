import { ImageModelInfo, TextModelInfo } from '@blocklet/ai-runtime/types';

// TODO: 考虑 LLM、AIGC、Text Embedding、TTS、Speech To Text
export type ModelType = 'llm' | 'aigc';

export type ModelInfo = TextModelInfo | ImageModelInfo;

export interface ModelSelectOption {
  name: string;
  model: string;
  maxTokens?: number;
  tags?: string[];
  starredAt?: number;
  detail?: unknown; // TODO: @wq
}
