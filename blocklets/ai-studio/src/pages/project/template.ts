import type { PromptAssistantYjs } from '@blocklet/ai-runtime/types';
import { RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { nanoid } from 'nanoid';

export function newDefaultPrompt(): Omit<
  PromptAssistantYjs,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
> {
  const promptId = nanoid();
  const paramId = nanoid();
  const varId = nanoid();

  return {
    type: 'prompt',
    parameters: {
      [paramId]: {
        index: 0,
        data: {
          id: paramId,
          type: 'string',
          key: 'question',
        },
      },
    },
    prompts: {
      [promptId]: {
        index: 0,
        data: {
          type: 'message',
          data: { id: promptId, role: 'user', content: '{{ question }}' },
        },
      },
    },
    outputVariables: {
      [varId]: {
        index: 0,
        data: { id: varId, name: RuntimeOutputVariable.text },
      },
    },
  };
}
