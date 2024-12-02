import { BlockBase } from '../base';
import { TypeRef } from '../type-define';
import { OrderedMap } from '../utils';

export type Role = 'system' | 'user' | 'assistant';

export interface ProcessLLM extends BlockBase {
  type: 'llm';
  llm?: {
    prompt?: string | OrderedMap<LLMPromptMessage>;

    modelSettings?: {
      model?: string;
      temperature?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    };

    outputs?: {
      fields?: OrderedMap<LLMOutputField>;
    };
  };
}

export type LLMPromptMessage = {
  id: string;
  role: Role;
  content?: string;
};

export type LLMOutputField = TypeRef & {
  id: string;
  description?: boolean;
  required?: boolean;
};
