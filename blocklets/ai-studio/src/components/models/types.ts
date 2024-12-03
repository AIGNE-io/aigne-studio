// TODO: 考虑 LLM、AIGC、Text Embedding、TTS、Speech To Text
export type ModelType = 'llm' | 'aigc';

export interface ModelSelectOption {
  name: string;
  model: string;
  maxTokens?: number;
  tags?: string[];
  starredAt?: number;
  detail?: unknown; // TODO: @wq
}
