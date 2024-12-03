import { AssistantYjs } from '@blocklet/ai-runtime/types';

import { ModelType } from './types';

export function resolveModelType(type: AssistantYjs['type']): ModelType | null {
  if (type === 'prompt') return 'llm';
  if (type === 'image') return 'aigc';
  return null;
}
