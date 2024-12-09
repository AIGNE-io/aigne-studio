// TODO: 考虑 LLM、AIGC、Text Embedding、TTS、Speech To Text
export type ModelType = 'llm' | 'aigc';

export interface AgentModel {
  name?: string;
  model: string;
  brand?: string;
  icon?: string;
  maxTokens?: number;
  tags?: string[];
  starred?: boolean;
  detail?: unknown; // TODO: @wq
}
